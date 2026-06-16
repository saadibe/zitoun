import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { MenuItem, RestaurantTable, HistoryEntry, CompositeOption, SelectedOption } from '../../models';

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

  // Modal choix paiement
  showPayChoice = false;

  // Modal encaissement
  showEnc   = false;
  payMethod = 'especes';
  received  = 0;
  change: number | null = null;
  encPending: HistoryEntry | null = null; // facture en attente à encaisser

  // Modal composite
  showComposite = false;
  compositeItem: MenuItem | null = null;
  selectedOpts: { [optionId: number]: number } = {}; // optionId → choiceId

  private clockTimer: any;

  payMethods = [
    { key:'especes', icon:'💵', label:'Espèces' },
    { key:'carte',   icon:'💳', label:'Carte'   },
    { key:'cheque',  icon:'📝', label:'Chèque'  },
    { key:'mixte',   icon:'🔀', label:'Mixte'   },
  ];

  // Composites prédéfinis (à terme venir du backend)
  compositeMenus: MenuItem[] = [
    {
      id: -1, name: 'Menu Makloub', emoji: '🥘', price: 12, category: 'MENU',
      available: true, isComposite: true,
      options: [
        {
          id: 1, label: 'Piment', type: 'single', required: true,
          choices: [
            { id: 1, label: '🌶️ Normal',    priceAdjust: 0 },
            { id: 2, label: '🌶️🌶️ Fort',  priceAdjust: 0 },
            { id: 3, label: '⚪ Sans piment', priceAdjust: 0 },
          ]
        },
        {
          id: 2, label: 'Boisson', type: 'single', required: false,
          choices: [
            { id: 4, label: '💧 Eau', priceAdjust: 0 },
            { id: 5, label: '🥤 Soda', priceAdjust: 1.5 },
          ]
        }
      ]
    },
    {
      id: -2, name: 'Menu Sandwich', emoji: '🫓', price: 9, category: 'MENU',
      available: true, isComposite: true,
      options: [
        {
          id: 3, label: 'Choix sandwich', type: 'single', required: true,
          choices: [
            { id: 6, label: '🥙 Chapati Thon',     priceAdjust: 0 },
            { id: 7, label: '🥙 Kaftaji',           priceAdjust: 0 },
            { id: 8, label: '🥙 Tabouna Escalope',  priceAdjust: 1 },
          ]
        },
        {
          id: 4, label: 'Piment', type: 'single', required: true,
          choices: [
            { id: 9,  label: '🌶️ Normal',    priceAdjust: 0 },
            { id: 10, label: '🌶️🌶️ Fort',  priceAdjust: 0 },
            { id: 11, label: '⚪ Sans piment', priceAdjust: 0 },
          ]
        }
      ]
    }
  ];

  filtered = computed(() => {
    const cat = this.activeCat();
    const m = this.menu().filter(i => i.available);
    const composites = this.compositeMenus.filter(c =>
      cat === 'all' || cat.toUpperCase() === 'MENU'
    );
    const regular = cat === 'all' ? m : m.filter(i => i.category.toUpperCase() === cat.toUpperCase());
    return cat === 'MENU' ? composites : cat === 'all' ? [...composites, ...regular] : regular;
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
  loadTables() { this.api.getTables().subscribe(t => this.tables.set(t)); }

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

  // ── Clic sur article ──────────────────────────────
  addItem(item: MenuItem) {
    if (item.isComposite && item.options?.length) {
      this.compositeItem = item;
      this.selectedOpts = {};
      this.showComposite = true;
    } else {
      this.cart.addItem(item);
    }
  }

  // ── Composite : sélectionner une option ───────────
  selectOpt(optionId: number, choiceId: number) {
    this.selectedOpts = { ...this.selectedOpts, [optionId]: choiceId };
  }

  isOptValid(): boolean {
    if (!this.compositeItem?.options) return true;
    return this.compositeItem.options
      .filter(o => o.required)
      .every(o => this.selectedOpts[o.id] !== undefined);
  }

  getOptLabel(item: MenuItem): string {
    if (!item.options) return '';
    return item.options.map(o => {
      const choiceId = this.selectedOpts[o.id];
      if (!choiceId) return '';
      const choice = o.choices.find(c => c.id === choiceId);
      return choice ? choice.label : '';
    }).filter(Boolean).join(' · ');
  }

  confirmComposite() {
    if (!this.compositeItem || !this.isOptValid()) return;
    const options: SelectedOption[] = [];
    if (this.compositeItem.options) {
      this.compositeItem.options.forEach(opt => {
        const choiceId = this.selectedOpts[opt.id];
        if (choiceId) {
          const choice = opt.choices.find(c => c.id === choiceId);
          if (choice) {
            options.push({
              optionId: opt.id, optionLabel: opt.label,
              choiceId: choice.id, choiceLabel: choice.label,
              priceAdjust: choice.priceAdjust
            });
          }
        }
      });
    }
    this.cart.addItem(this.compositeItem, options);
    this.showComposite = false;
    this.compositeItem = null;
  }

  optionLabel(item: MenuItem, selectedOpts: SelectedOption[] | undefined): string {
    if (!selectedOpts?.length) return '';
    return selectedOpts.map(o => o.choiceLabel).join(' · ');
  }

  // ── Envoi cuisine ──────────────────────────────────
  send() {
    if (!this.canSend()) return;
    if (this.cart.table() === 0) { this.openEnc(null); return; }
    this.showPayChoice = true;
  }

  choosePayNow() {
    this.showPayChoice = false;
    this.openEnc(null);
  }

  choosePayAfter() {
    this.showPayChoice = false;
    // Créer une entrée historique "pending"
    const table = this.cart.table()!;
    const items = this.cart.items();
    const total = this.cart.total();
    const entryId = 'F' + Date.now().toString().slice(-6);
    const entry: HistoryEntry = {
      id: entryId, table, total, method: null, status: 'pending',
      date: new Date().toLocaleDateString('fr-FR'),
      time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      items: items.map(i => ({
        id: i.item.id, name: i.item.name, emoji: i.item.emoji, price: i.item.price, qty: i.qty,
        options: this.optionLabel(i.item, i.selectedOptions)
      }))
    };
    this.cart.addToHistory(entry);
    this.sendToKitchen(null, null);
  }

  // ── Encaissement ───────────────────────────────────
  openEnc(pendingEntry: HistoryEntry | null) {
    this.encPending  = pendingEntry;
    this.showEnc     = true;
    this.payMethod   = 'especes';
    this.received    = 0;
    this.change      = null;
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
      this.showEnc = this.showPayChoice = this.showComposite = false;
    }
  }

  confirmer() {
    if (this.payMethod === 'especes' && this.received < this.encTotal()) {
      alert(`⚠ Montant insuffisant.\nTotal : ${this.settings.fmt(this.encTotal())}`);
      return;
    }
    if (this.encPending) {
      // Encaissement d'une facture existante (payer après manger)
      this.cart.updateHistory(this.encPending.id, {
        method: this.payMethod, status: 'paid'
      });
      this.showEnc = false;
      this.encPending = null;
      return;
    }
    // Encaissement immédiat (payer maintenant)
    const table = this.cart.table()!;
    const items = this.cart.items();
    const total = this.cart.total();
    this.cart.addToHistory({
      id: 'F' + Date.now().toString().slice(-6),
      table, total, method: this.payMethod, status: 'paid',
      date: new Date().toLocaleDateString('fr-FR'),
      time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      items: items.map(i => ({
        id: i.item.id, name: i.item.name, emoji: i.item.emoji, price: i.item.price, qty: i.qty,
        options: this.optionLabel(i.item, i.selectedOptions)
      }))
    });
    this.showEnc = false;
    this.sendToKitchen(this.payMethod, null);
  }

  private sendToKitchen(payMethod: string | null, entryId: string | null) {
    const table = this.cart.table()!;
    const items = this.cart.items();
    this.sending.set(true);

    const payload = {
      tableNumber: table,
      items: items.map(i => ({
        menuItemId: i.item.id > 0 ? i.item.id : 1, // fallback pour composites
        quantity: i.qty,
        note: [i.note, this.optionLabel(i.item, i.selectedOptions)].filter(Boolean).join(' | ')
      }))
    };

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.api.sendToKitchen(order.id).subscribe();
        // Ne recharger les tables QUE si paiement immédiat
        if (payMethod) this.loadTables();
        else {
          // Payer après : table reste OCCUPIED
          this.tables.update(list =>
            list.map(t => t.number === table ? { ...t, status: 'OCCUPIED' as const } : t)
          );
        }
        const label = table === 0 ? '🥡 À emporter' : `Table ${table}`;
        const paid  = payMethod ? ' ✅ Encaissé' : ' 💳 À encaisser';
        this.sentMsg = `✓ Commande envoyée — ${label} —${paid}`;
        this.cart.clear();
        this.sending.set(false);
        setTimeout(() => this.sentMsg = '', 4500);
      },
      error: () => {
        if (table !== 0) {
          this.tables.update(list =>
            list.map(t => t.number === table ? { ...t, status: 'OCCUPIED' as const } : t)
          );
        }
        this.sentMsg = `✓ Enregistré hors ligne`;
        this.cart.clear();
        this.sending.set(false);
        setTimeout(() => this.sentMsg = '', 3000);
      }
    });
  }

  openTicket() {}
}
