import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
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

  // Modal options article (piment + menu)
  showOptions  = false;
  optionItem: MenuItem | null = null;
  optPiment    = 'normal';
  optWithMenu  = false;

  // Modal choix paiement
  showPayChoice = false;

  // Modal encaissement
  showEnc     = false;
  payMethod   = 'especes';
  received    = 0;
  change: number | null = null;
  encPending: HistoryEntry | null = null;

  private clockTimer: any;
  private _pendingPayMethod: string | null = null;

  payMethods = [
    { key:'especes', icon:'💵', label:'Espèces' },
    { key:'carte',   icon:'💳', label:'Carte'   },
    { key:'cheque',  icon:'📝', label:'Chèque'  },
    { key:'mixte',   icon:'🔀', label:'Mixte'   },
  ];

  pimentOpts = [
    { key:'normal', label:'🌶️ Normal'      },
    { key:'fort',   label:'🌶️🌶️ Fort'    },
    { key:'sans',   label:'⚪ Sans piment'  },
  ];

  filtered = computed(() => {
    const cat = this.activeCat();
    const m = this.menu().filter(i => i.available);
    return cat === 'all' ? m : m.filter(i => i.category.toUpperCase() === cat.toUpperCase());
  });

  constructor(
    public cart: CartService,
    public settings: SettingsService,
    private api: ApiService
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

  // ── Clic sur article ─────────────────────────────
  addItem(item: MenuItem) {
    if (this.settings.isSandwich(item.category)) {
      // Sandwich → proposer piment + option menu
      this.optionItem  = item;
      this.optPiment   = 'normal';
      this.optWithMenu = false;
      this.showOptions = true;
    } else {
      this.cart.addItem(item);
    }
  }

  confirmOptions() {
    if (!this.optionItem) return;
    this.cart.addItem(this.optionItem, this.optPiment, this.optWithMenu);
    this.showOptions = false;
    this.optionItem  = null;
  }

  itemNote(item: {piment?:string, withMenu?:boolean}): string {
    const parts: string[] = [];
    if (item.piment === 'fort') parts.push('🌶️🌶️ Fort');
    else if (item.piment === 'sans') parts.push('⚪ Sans piment');
    if (item.withMenu) parts.push(`🍽️ Menu +${this.settings.fmt(this.cart.menuPrice)}`);
    return parts.join(' · ');
  }

  // ── Envoi ────────────────────────────────────────
  send() {
    if (!this.canSend()) return;
    if (this.cart.table() === 0) { this.openEnc(null); return; }
    this.showPayChoice = true;
  }

  choosePayNow()  { this.showPayChoice = false; this.openEnc(null); }

  choosePayAfter() {
    this.showPayChoice = false;
    const table = this.cart.table()!;
    const items = this.cart.items();
    const total = this.cart.total();
    const entry: HistoryEntry = {
      id: 'F' + Date.now().toString().slice(-6),
      table, total, method: null, status: 'pending',
      date: new Date().toLocaleDateString('fr-FR'),
      time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      items: items.map(i => ({
        id: i.item.id, name: i.item.name, emoji: i.item.emoji,
        price: i.item.price + (i.withMenu ? this.cart.menuPrice : 0),
        qty: i.qty, note: this.itemNote(i)
      }))
    };
    this.cart.addToHistory(entry);
    this.execSend(null);
  }

  openEnc(pending: HistoryEntry | null) {
    this.encPending = pending;
    this.showEnc    = true;
    this.payMethod  = 'especes';
    this.received   = 0;
    this.change     = null;
  }

  calcChange() {
    const total = this.encPending ? this.encPending.total : this.cart.total();
    this.change = this.received >= total ? this.received - total : null;
  }
  encTotal(): number {
    return this.encPending ? this.encPending.total : this.cart.total();
  }

  closeModal(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-ov')) {
      this.showEnc = this.showPayChoice = this.showOptions = false;
    }
  }

  confirmer() {
    if (this.payMethod === 'especes' && this.received < this.encTotal()) {
      alert(`⚠ Montant insuffisant.\nTotal : ${this.settings.fmt(this.encTotal())}`);
      return;
    }
    if (this.encPending) {
      this.cart.updateHistory(this.encPending.id, { method: this.payMethod, status: 'paid' });
      this.showEnc = false; this.encPending = null;
      return;
    }
    const table = this.cart.table()!;
    const items = this.cart.items();
    const total = this.cart.total();
    this.cart.addToHistory({
      id: 'F' + Date.now().toString().slice(-6),
      table, total, method: this.payMethod, status: 'paid',
      date: new Date().toLocaleDateString('fr-FR'),
      time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      items: items.map(i => ({
        id: i.item.id, name: i.item.name, emoji: i.item.emoji,
        price: i.item.price + (i.withMenu ? this.cart.menuPrice : 0),
        qty: i.qty, note: this.itemNote(i)
      }))
    });
    this.showEnc = false;
    this._pendingPayMethod = this.payMethod;
    this.execSend(this.payMethod);
  }

  private execSend(payMethod: string | null) {
    const table = this.cart.table()!;
    const items = this.cart.items();
    this.sending.set(true);
    const payload = {
      tableNumber: table,
      items: items.map(i => ({
        menuItemId: i.item.id,
        quantity:   i.qty,
        note: this.itemNote(i) + (i.note ? ' | ' + i.note : '')
      }))
    };
    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.api.sendToKitchen(order.id).subscribe();
        // Si paiement immédiat, enregistrer en base
        if (this._pendingPayMethod) {
          this.api.payOrder(order.id, this._pendingPayMethod).subscribe();
          this._pendingPayMethod = null;
        }
        this.loadTables();
        const label = table === 0 ? '🥡 À emporter' : `Table ${table}`;
        this.sentMsg = `✓ Commande envoyée — ${label} — ${payMethod ? '✅ Encaissé' : '💳 À encaisser'}`;
        this.cart.clear();
        this.sending.set(false);
        setTimeout(() => this.sentMsg = '', 4000);
      },
      error: () => {
        if (table !== 0) this.tables.update(l => l.map(t => t.number === table ? {...t, status:'OCCUPIED' as const} : t));
        this.sentMsg = `✓ Enregistré`;
        this.cart.clear();
        this.sending.set(false);
        setTimeout(() => this.sentMsg = '', 3000);
      }
    });
  }

  openTicket() {}
}
