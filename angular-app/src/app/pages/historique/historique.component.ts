import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { PrinterService, TicketData } from '../../services/printer.service';
import { HistoryEntry } from '../../models';

interface ServiceStats {
  date: string;
  totalJour: number;
  nbCommandes: number;
  especes: { total: number; nb: number };
  carte:   { total: number; nb: number };
  cheque:  { total: number; nb: number };
  mixte:   { total: number; nb: number };
  autre?:  { total: number; nb: number };
}

@Component({ selector:'app-historique', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./historique.component.html', styleUrl:'./historique.component.scss' })
export class HistoriqueComponent implements OnInit {
  tab = signal<'historique'|'service'>('historique');

  selected   = signal<HistoryEntry | null>(null);
  showEnc    = false;
  payMethod  = 'especes';
  received   = 0;
  change: number | null = null;

  // Fin de service
  serviceStats  = signal<ServiceStats | null>(null);
  loadingStats  = signal(false);
  showService   = signal(false);

  readonly methodIcons: {[k:string]:string} = {
    especes:'💵', carte:'💳', cheque:'📝', mixte:'🔀'
  };

  readonly statusLabels: {[k:string]:{label:string,color:string}} = {
    SENT:      { label:'⏳ Envoyée',    color:'#e67e22' },
    PREPARING: { label:'👨‍🍳 Préparation', color:'#8e44ad' },
    READY:     { label:'✅ Prête',       color:'#27ae60' },
    SERVED:    { label:'🍽️ Servie',      color:'#2980b9' },
    PENDING:   { label:'💳 À encaisser', color:'#c0392b' },
  };

  getStatusLabel(entry: HistoryEntry): string {
    if (entry.status === 'paid') return '✅ Encaissée';
    if (entry.status === 'pending') return '💳 À encaisser';
    return '⏳ En cours';
  }
  getStatusColor(entry: HistoryEntry): string {
    if (entry.status === 'paid') return '#27ae60';
    return '#e67e22';
  }
  payMethods = [
    { key:'especes', icon:'💵', label:'Espèces' },
    { key:'carte',   icon:'💳', label:'Carte'   },
    { key:'cheque',  icon:'📝', label:'Chèque'  },
    { key:'mixte',   icon:'🔀', label:'Mixte'   },
  ];

  constructor(
    public cart: CartService,
    public settings: SettingsService,
    private auth: AuthService,
    private api: ApiService,
    private printer: PrinterService
  ) {}

  ngOnInit() {
    this.cart.setToken(this.auth.token);
    this.cart.loadHistoryFromApi();
  }

  get pending() { return this.cart.history().filter(e => e.status === 'pending'); }
  get paid()    { return this.cart.history().filter(e => e.status === 'paid'); }

  // ── Fin de service ──────────────────────────────────
  loadServiceStats() {
    this.loadingStats.set(true);
    this.api.getServiceStats().subscribe({
      next: (stats) => {
        this.serviceStats.set(stats);
        this.loadingStats.set(false);
        this.showService.set(true);
      },
      error: () => this.loadingStats.set(false)
    });
  }

  closeService() { this.showService.set(false); }

  async printServiceReport() {
    const s = this.serviceStats();
    if (!s) return;
    const rs = this.settings.settings();
    const fmt = (v: number) => v.toFixed(2) + ' ' + rs.currency;

    const methods = [
      { label: '💵 Espèces', data: s.especes },
      { label: '💳 Carte',   data: s.carte   },
      { label: '📝 Chèque',  data: s.cheque  },
      { label: '🔀 Mixte',   data: s.mixte   },
    ].filter(m => m.data.nb > 0);

    const lignes = methods.map(m =>
      `${m.label} (${m.data.nb} ticket${m.data.nb>1?'s':''})`.padEnd(24) +
      fmt(m.data.total)
    ).join('<br>');

    // Ticket fin de service via PassPRNT
    const data: TicketData = {
      tableNumber:        null,
      restaurantName:     rs.name,
      restaurantSubtitle: rs.subtitle,
      total:              s.totalJour,
      date:               s.date,
      time:               new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      orderRef:           'FIN DE SERVICE',
      items:              methods.map(m => ({
        name:  m.label,
        emoji: '',
        price: m.data.total,
        qty:   1,
        note:  `${m.data.nb} ticket${m.data.nb>1?'s':''}`
      }))
    };

    const ok = await this.printer.printTicket(data);
    if (!ok) alert('⚠ Impression échouée\n' + this.printer.lastError());
  }

  // ── Historique détail ───────────────────────────────
  getPreview(entry: HistoryEntry): string {
    const p = entry.items.slice(0,3).map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(', ');
    return entry.items.length > 3 ? p + '...' : p;
  }

  open(entry: HistoryEntry) {
    this.selected.set({ ...entry, items: [...entry.items] });
    this.showEnc = false;
  }
  close() { this.selected.set(null); }

  openEncForEntry() {
    this.showEnc = true; this.payMethod = 'especes';
    this.received = 0; this.change = null;
  }

  calcChange() {
    const e = this.selected();
    if (!e) return;
    this.change = this.received >= e.total ? this.received - e.total : null;
  }

  confirmerEncEntry() {
    const e = this.selected();
    if (!e) return;
    // Pas de restriction de montant — on accepte tous les modes
    if (e.id) {
      this.cart.updateHistory(e.id, { method: this.payMethod, status: 'paid' });
    }
    this.close();
  }

  async printTicket(h: HistoryEntry) {
    const s = this.settings.settings();
    const data: TicketData = {
      tableNumber:        h.table ?? null,
      restaurantName:     s.name,
      restaurantSubtitle: s.subtitle,
      legalName:          s.legalName,
      address:            s.address,
      phone:              s.phone,
      email:              s.email,
      taxNumber:          s.taxNumber,
      tvaNumber:          s.tvaNumber,
      nafCode:            s.nafCode,
      ticketFooter:       s.ticketFooter,
      tvaRate:            s.tvaRate,
      total:              h.total,
      paymentMethod:      h.method ?? null,
      date:               h.date,
      time:               h.time,
      orderRef:           h.id,
      items:              h.items.map(i => ({
        name:  i.name,
        emoji: i.emoji,
        price: i.price,
        qty:   i.qty,
        note:  i.note
      }))
    };
    const ok = await this.printer.printTicket(data);
    if (!ok) alert('⚠ Impression échouée\n' + this.printer.lastError());
  }

  async printTicketSimple(h: HistoryEntry) {
    const s = this.settings.settings();
    const nbPlats = h.items.reduce((sum, i) => sum + i.qty, 0);

    // Construire les lignes résumé : une ligne par article (nom + qty) sans prix individuel
    const resumeItems = h.items.map(i => ({
      name:  i.name,
      emoji: i.emoji,
      price: 0,           // pas de prix individuel sur ticket résumé
      qty:   i.qty,
      note:  i.note
    }));

    const data: TicketData = {
      tableNumber:        h.table ?? null,
      restaurantName:     s.name,
      restaurantSubtitle: s.subtitle,
      legalName:          s.legalName,
      address:            s.address,
      phone:              s.phone,
      email:              s.email,
      taxNumber:          s.taxNumber,
      tvaNumber:          s.tvaNumber,
      nafCode:            s.nafCode,
      ticketFooter:       s.ticketFooter,
      tvaRate:            0,              // pas de TVA sur ticket résumé
      total:              h.total,
      paymentMethod:      h.method ?? null,
      date:               h.date,
      time:               h.time,
      orderRef:           h.id,
      items:              resumeItems
    };
    const ok = await this.printer.printTicket(data);
    if (!ok) alert('⚠ Impression échouée\n' + this.printer.lastError());
  }

  clearHistory() {
    if (confirm("Effacer tout l'historique local ?")) this.cart.clearHistory();
  }
}
