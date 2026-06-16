import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { MenuItem, RestaurantTable } from '../../models';

type PayMode = 'now' | 'after';  // payer maintenant ou après manger

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

  // Étape 1 : choix du mode de paiement
  showPayChoice = false;
  // Étape 2 : encaissement immédiat
  showEnc   = false;
  payMethod = 'especes';
  received  = 0;
  change: number | null = null;

  private clockTimer: any;

  payMethods = [
    { key:'especes', icon:'💵', label:'Espèces' },
    { key:'carte',   icon:'💳', label:'Carte'   },
    { key:'cheque',  icon:'📝', label:'Chèque'  },
    { key:'mixte',   icon:'🔀', label:'Mixte'   },
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
  updateClock() {
    this.clock = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  }
  loadTables() { this.api.getTables().subscribe(t => this.tables.set(t)); }

  get tableLabel(): string {
    const t = this.cart.table();
    if (t === 0)    return '🥡 À emporter';
    if (t !== null) return `Table ${t} · ${this.clock}`;
    return 'Aucune table sélectionnée';
  }

  selectTable(n: number) { this.cart.setTable(n); }
  selectCat(k: string)   { this.activeCat.set(k); }
  addItem(item: MenuItem){ this.cart.addItem(item); }

  canSend(): boolean {
    const t = this.cart.table();
    return (t === 0 || t !== null) && this.cart.count() > 0;
  }

  // ── Bouton "Envoyer en cuisine" ─────────────────
  send() {
    if (!this.canSend()) return;
    // Emporter → toujours payer maintenant
    if (this.cart.table() === 0) {
      this.openEnc();
      return;
    }
    // Table → choix : payer maintenant ou après manger
    this.showPayChoice = true;
  }

  // Choix "Payer maintenant"
  choosePayNow() {
    this.showPayChoice = false;
    this.openEnc();
  }

  // Choix "Payer après manger" → envoi direct cuisine
  choosePayAfter() {
    this.showPayChoice = false;
    this.sendToKitchen(null);
  }

  openEnc() {
    this.showEnc  = true;
    this.payMethod = 'especes';
    this.received  = 0;
    this.change    = null;
  }

  calcChange() {
    const total = this.cart.total();
    this.change = this.received >= total ? this.received - total : null;
  }

  closeModal(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-ov')) {
      this.showEnc = false;
      this.showPayChoice = false;
    }
  }

  // ── Valider l'encaissement → puis envoyer cuisine ──
  confirmer() {
    if (this.payMethod === 'especes' && this.received < this.cart.total()) {
      alert(`⚠ Montant insuffisant.\nTotal : ${this.settings.fmt(this.cart.total())}`);
      return;
    }
    const table = this.cart.table()!;
    const items = this.cart.items();
    const total = this.cart.total();

    // Sauvegarder dans historique
    this.cart.addToHistory({
      id:   'F' + Date.now().toString().slice(-6),
      table, total,
      date:   new Date().toLocaleDateString('fr-FR'),
      time:   new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      method: this.payMethod,
      items:  items.map(i => ({ id:i.item.id, name:i.item.name, emoji:i.item.emoji, price:i.item.price, qty:i.qty }))
    });

    this.showEnc = false;
    this.sendToKitchen(this.payMethod);
  }

  // ── Envoi en cuisine (payMethod=null si payer après) ──
  private sendToKitchen(payMethod: string | null) {
    const table = this.cart.table()!;
    const items = this.cart.items();
    this.sending.set(true);

    const payload = {
      tableNumber: table,
      items: items.map(i => ({ menuItemId: i.item.id, quantity: i.qty, note: i.note }))
    };

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.api.sendToKitchen(order.id).subscribe();
        this.loadTables();
        const label = table === 0 ? '🥡 À emporter' : `Table ${table}`;
        const paid  = payMethod ? ' · ✅ Encaissé' : ' · 💳 À encaisser';
        this.sentMsg = `✓ Commande envoyée — ${label}${paid}`;
        this.cart.clear();
        this.sending.set(false);
        setTimeout(() => this.sentMsg = '', 4000);
      },
      error: () => {
        if (table !== 0) {
          this.tables.update(list =>
            list.map(t => t.number === table ? { ...t, status: 'OCCUPIED' as const } : t)
          );
        }
        const label = table === 0 ? '🥡 À emporter' : `Table ${table}`;
        this.sentMsg = `✓ Commande enregistrée — ${label}`;
        this.cart.clear();
        this.sending.set(false);
        setTimeout(() => this.sentMsg = '', 4000);
      }
    });
  }

  openTicket() { /* TODO */ }
}
