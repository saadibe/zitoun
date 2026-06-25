import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
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
    private api: ApiService
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

  printServiceReport() {
    const s = this.serviceStats();
    if (!s) return;
    const rs = this.settings.settings();
    const fmt = (v: number) => v.toFixed(2) + ' ' + rs.currency;

    const methods = [
      { label: '💵 Espèces',       data: s.especes },
      { label: '💳 Carte',         data: s.carte   },
      { label: '📝 Chèque',        data: s.cheque  },
      { label: '🔀 Mixte',         data: s.mixte   },
    ].filter(m => m.data.nb > 0);

    const rows = methods.map(m =>
      `<div class="r"><span>${m.label} (${m.data.nb} ticket${m.data.nb>1?'s':''})</span>
       <span>${fmt(m.data.total)}</span></div>`
    ).join('');

    const w = window.open('', '_blank', 'width=420,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Fin de service</title>
    <style>
      body{font-family:"Courier New",monospace;max-width:300px;margin:0 auto;padding:16px 12px}
      .name{text-align:center;font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:2px}
      .tag{font-size:10px;color:#888;text-align:center;margin:2px 0}
      hr{border:none;border-top:1px dashed #bbb;margin:8px 0}
      .r{display:flex;justify-content:space-between;font-size:12px;padding:4px 0}
      .total{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;padding:6px 0;border-top:2px solid #333}
      .footer{text-align:center;font-size:10px;color:#999;margin-top:12px}
      .title{font-size:13px;font-weight:bold;text-align:center;margin:4px 0}
      @media print{body{padding:4px}}
    </style></head><body>
    <div class="name">${rs.name}</div>
    <div class="tag">${rs.subtitle}</div>
    <hr>
    <div class="title">★ FIN DE SERVICE ★</div>
    <div class="tag">${s.date} — ${s.nbCommandes} commande${s.nbCommandes>1?'s':''}</div>
    <hr>${rows}<hr>
    <div class="total"><span>TOTAL JOURNÉE</span><span>${fmt(s.totalJour)}</span></div>
    <div class="footer">— Service clôturé —<br><b>${rs.name}</b></div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
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

  printTicket(h: HistoryEntry) {
    const s = this.settings.settings();
    const fmt = (v: number) => v.toFixed(2) + ' ' + s.currency;
    const tvaRate = s.tvaRate || 0;
    const tva  = tvaRate > 0 ? fmt(h.total - h.total / (1 + tvaRate/100)) : null;
    const ht   = tvaRate > 0 ? fmt(h.total / (1 + tvaRate/100)) : null;

    const rows = h.items.map(i =>
      `<div class="r"><span>${i.emoji} ${i.name} ×${i.qty}${i.note ? ` <em>${i.note}</em>` : ''}</span>
       <span>${fmt(i.price * i.qty)}</span></div>`
    ).join('');

    const tableInfo = h.table ? `Table ${h.table} · ` : '🥡 Emporter · ';
    const w = window.open('', '_blank', 'width=420,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Facture</title>
    <style>
      body{font-family:"Courier New",monospace;max-width:300px;margin:0 auto;padding:16px 12px}
      .name{text-align:center;font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:2px}
      .tag,.meta{font-size:10px;color:#888;text-align:center;margin:2px 0}
      hr{border:none;border-top:1px dashed #bbb;margin:8px 0}
      .r{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}
      .total{display:flex;justify-content:space-between;font-size:15px;font-weight:bold;padding:5px 0;border-top:2px solid #333}
      .footer{text-align:center;font-size:10px;color:#999;margin-top:12px}
      em{font-size:10px;color:#666;font-style:italic}
      @media print{body{padding:4px}}
    </style></head><body>
    <div class="name">${s.name}</div>
    ${s.subtitle ? `<div class="tag">${s.subtitle}${s.city?' · '+s.city:''}</div>` : ''}
    <hr>
    <div class="meta">${h.date} ${h.time}</div>
    <div class="meta">${tableInfo}Facture ${h.id}</div>
    <hr>${rows}<hr>
    ${tva ? `<div class="r"><span>HT</span><span>${ht} ${s.currency}</span></div>
             <div class="r"><span>TVA (${s.tvaRate}%)</span><span>${tva} ${s.currency}</span></div><hr>` : ''}
    <div class="total"><span>TOTAL</span><span>${fmt(h.total)}</span></div>
    ${h.method ? `<div class="meta">${this.methodIcons[h.method]||''} ${h.method.toUpperCase()}</div>` : ''}
    <div class="footer">Merci de votre visite 🙏<br><b>${s.name}</b>
      ${s.city ? '<br>'+s.city : ''}
      ${s.taxNumber ? '<br>'+s.taxNumber : ''}
    </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  clearHistory() {
    if (confirm("Effacer tout l'historique local ?")) this.cart.clearHistory();
  }
}
