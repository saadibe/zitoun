import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { PrinterService, TicketData } from '../../services/printer.service';
import { MenuItem, RestaurantTable, HistoryEntry } from '../../models';

@Component({ selector:'app-commandes', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./commandes.component.html', styleUrl:'./commandes.component.scss' })
export class CommandesComponent implements OnInit, OnDestroy {
  tables    = signal<RestaurantTable[]>([]);
  menu      = signal<MenuItem[]>([]);
  activeCat = signal<string>('all');
  mobileTab = 'menu';
  sending   = signal(false);
  sentMsg   = '';
  clock     = '';

  // Modal options piment/menu
  showOptions  = false;
  optionItem: MenuItem | null = null;
  optPiment    = 'normal';
  optWithMenu  = false;

  // Modal choix paiement
  showPayChoice = false;

  // Modal encaissement (payer maintenant)
  showEnc    = false;
  payMethod  = 'especes';
  received   = 0;
  change: number | null = null;
  globalNote = '';   // Note globale commande (allergies, préférences...)

  private clockTimer: any;

  payMethods = [
    { key:'especes', icon:'💵', label:'Espèces' },
    { key:'carte',   icon:'💳', label:'Carte'   },
    { key:'cheque',  icon:'📝', label:'Chèque'  },
    { key:'mixte',   icon:'🔀', label:'Mixte'   },
  ];

  pimentOpts = [
    { key:'normal', label:'🌶️ Normal'     },
    { key:'fort',   label:'🌶️🌶️ Fort'   },
    { key:'sans',   label:'⚪ Sans piment' },
  ];

  filtered = computed(() => {
    const cat = this.activeCat();
    const m = this.menu().filter(i => i.available);
    return cat === 'all' ? m : m.filter(i => i.category.toUpperCase() === cat.toUpperCase());
  });

  constructor(
    public cart: CartService,
    public settings: SettingsService,
    private auth: AuthService,
    private api: ApiService,
    private printer: PrinterService
  ) {}

  ngOnInit() {
    this.api.getMenu().subscribe(m => this.menu.set(m));
    this.loadTables();
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  }
  ngOnDestroy() { clearInterval(this.clockTimer); }
  updateClock() { this.clock = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); }
  loadTables()  { this.api.getTables().subscribe(t => this.tables.set(t)); }

  get tableLabel(): string {
    const t = this.cart.table();
    if (t === 0)    return '🥡 À emporter';
    if (t !== null) return `Table ${t} · ${this.clock}`;
    return 'Aucune table sélectionnée';
  }

  selectTable(n: number) { this.cart.setTable(n); }
  selectCat(k: string)   { this.activeCat.set(k); }
  canSend(): boolean {
    const t = this.cart.table();
    return (t === 0 || t !== null) && this.cart.count() > 0;
  }

  // ── Clic article ─────────────────────────────────
  addItem(item: MenuItem) {
    if (this.settings.isSandwich(item.category)) {
      this.optionItem  = item;
      this.optPiment   = 'normal';
      this.optWithMenu = false;
      this.showOptions = true;
    } else {
      this.cart.addItem(item);
    }
  }

  selectOpt(key: string) { this.optPiment = key; }
  toggleMenu()           { this.optWithMenu = !this.optWithMenu; }

  confirmOptions() {
    if (!this.optionItem) return;
    this.cart.addItem(this.optionItem, this.optPiment, this.optWithMenu);
    this.showOptions = false;
    this.optionItem  = null;
  }

  itemNote(item: {piment?:string, withMenu?:boolean}): string {
    const p: string[] = [];
    if (item.piment === 'fort')  p.push('🌶️🌶️ Fort');
    if (item.piment === 'sans')  p.push('⚪ Sans piment');
    if (item.withMenu) p.push(`🍽️ Menu +${this.settings.fmt(this.cart.menuPrice)}`);
    return p.join(' · ');
  }

  // ── Bouton envoyer ───────────────────────────────
  send() {
    if (!this.canSend()) return;
    // À emporter → toujours payer maintenant
    if (this.cart.table() === 0) {
      this.openEnc();
      return;
    }
    this.showPayChoice = true;
  }

  // ── Payer maintenant : encaisser puis cuisine ────
  choosePayNow() {
    this.showPayChoice = false;
    this.openEnc();
  }

  openEnc() {
    this.showEnc   = true;
    this.payMethod = 'especes';
    this.received  = 0;
    this.change    = null;
  }

  calcChange() {
    this.change = this.received >= this.cart.total()
      ? this.received - this.cart.total() : null;
  }

  confirmer() {
    this.showEnc = false;
    this.sendToApi('now', this.payMethod);
  }

  // ── Payer après manger : cuisine directe ─────────
  choosePayAfter() {
    this.showPayChoice = false;
    // Envoyer en cuisine, paiement différé (à la table)
    this.sendToApi('after', null);
  }

  closeModal(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-ov')) {
      this.showEnc = this.showPayChoice = this.showOptions = false;
    }
  }

  // ── Envoi API ────────────────────────────────────
  private sendToApi(when: 'now' | 'after', payMethod: string | null) {
    const table = this.cart.table()!;
    const items = this.cart.items();
    const total = this.cart.total();
    this.sending.set(true);

    const payload = {
      tableNumber: table,
      globalNote: this.globalNote,
      serverName: this.auth.session()?.user || 'Caisse',
      items: items.map(i => ({
        menuItemId: i.item.id,
        quantity:   i.qty,
        unitPrice:  i.item.price + (i.withMenu ? this.cart.menuPrice : 0),
        note:       this.itemNote(i) + (i.note ? ' | ' + i.note : '')
      }))
    };

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.api.sendToKitchen(order.id).subscribe({
          next: () => {
            // Dans les 2 cas : la commande va en cuisine (SENT)
            // "Payer maintenant" = mode paiement noté, encaissement via Tables
            // "Payer après" = paiement différé, encaissement via Tables
            const status = when === 'now' ? 'paid' as const : 'pending' as const;
            const msg    = when === 'now'
              ? `✅ Commande envoyée en cuisine — encaisser via Tables`
              : `💳 Commande en cuisine — à encaisser`;
            this.saveHistory(table, items, total, when === 'now' ? payMethod : null, status);
            this.finishSend(table, msg);
          },
          error: () => this.finishSend(table, `✓ Enregistré`)
        });
      },
      error: () => {
        if (table !== 0)
          this.tables.update(l => l.map(t =>
            t.number === table ? { ...t, status: 'OCCUPIED' as const } : t
          ));
        this.finishSend(table, `✓ Enregistré hors ligne`);
      }
    });
  }

  private saveHistory(table: number, items: any[], total: number,
                      method: string|null, status: 'paid'|'pending') {
    const entry: HistoryEntry = {
      id:     'F' + Date.now().toString().slice(-6),
      table,  total, method, status,
      date:   new Date().toLocaleDateString('fr-FR'),
      time:   new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      items:  items.map(i => ({
        id: i.item.id, name: i.item.name, emoji: i.item.emoji,
        price: i.item.price + (i.withMenu ? this.cart.menuPrice : 0),
        qty: i.qty, note: this.itemNote(i)
      }))
    };
    this.cart.addToHistory(entry);
  }

  private finishSend(table: number, msg: string) {
    const label = table === 0 ? '🥡 À emporter' : `Table ${table}`;
    this.sentMsg = `✓ ${label} — ${msg}`;
    this.cart.clear();
    this.globalNote = '';
    this.sending.set(false);
    this.loadTables();
    setTimeout(() => this.sentMsg = '', 4000);
  }

  async openTicket() {
    if (!this.canSend()) return;

    const items = this.cart.items();
    const s = this.settings.settings();
    const data: TicketData = {
      tableNumber:        this.cart.table(),
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
      currency:           s.currency,
      total:              this.cart.total(),
      date:               new Date().toLocaleDateString('fr-FR'),
      time:               new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      items: items.map(i => ({
        name:  i.item.name,
        emoji: i.item.emoji,
        price: i.item.price + (i.withMenu ? this.cart.menuPrice : 0),
        qty:   i.qty,
        note:  this.itemNote(i)
      }))
    };

    const ok = await this.printer.printTicket(data);
    if (!ok) {
      alert(`⚠ Impression échouée\n${this.printer.lastError()}\n\nConfigurez l\'imprimante dans Admin > Imprimante`);
    }
  }
}
