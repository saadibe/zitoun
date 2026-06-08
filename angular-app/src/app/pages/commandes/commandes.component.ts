import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { MenuItem, RestaurantTable } from '../../models';

@Component({ selector:'app-commandes', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./commandes.component.html', styleUrl:'./commandes.component.scss' })
export class CommandesComponent implements OnInit, OnDestroy {
  tables   = signal<RestaurantTable[]>([]);
  menu     = signal<MenuItem[]>([]);
  activeCat = 'all';
  mobileTab = 'menu';
  sending  = signal(false);
  sentMsg  = '';
  clock    = '';
  showEnc  = false;
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
    const m = this.menu().filter(i => i.available);
    return this.activeCat === 'all' ? m
      : m.filter(i => i.category.toUpperCase() === this.activeCat.toUpperCase());
  });

  constructor(public cart: CartService, public settings: SettingsService, private api: ApiService) {}

  ngOnInit() {
    this.api.getMenu().subscribe(m => this.menu.set(m));
    this.api.getTables().subscribe(t => this.tables.set(t));
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  }
  ngOnDestroy() { clearInterval(this.clockTimer); }
  updateClock() {
    this.clock = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  }

  get tableLabel(): string {
    const t = this.cart.table();
    if (t === 0) return '🥡 À emporter';
    if (t !== null) return `Table ${t} · ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
    return 'Aucune table sélectionnée';
  }

  selectTable(n: number) { this.cart.setTable(n); }
  selectCat(k: string)   { this.activeCat = k; }
  addItem(item: MenuItem){ this.cart.addItem(item); }
  canSend(): boolean     { return this.cart.table() !== null && this.cart.count() > 0; }

  send() {
    if (!this.canSend()) return;
    this.showEnc = true;
    this.payMethod = 'especes';
    this.received = 0;
    this.change = null;
  }

  calcChange() {
    const total = this.cart.total();
    this.change = this.received >= total ? this.received - total : null;
  }

  closeEnc(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-ov')) this.showEnc = false;
  }

  confirmer() {
    if (this.payMethod === 'especes' && this.received < this.cart.total()) {
      alert(`⚠ Montant insuffisant. Total : ${this.settings.fmt(this.cart.total())}`);
      return;
    }
    const table = this.cart.table()!;
    const items = this.cart.items();
    const total = this.cart.total();

    // Sauvegarder dans l'historique
    this.cart.addToHistory({
      id: 'F' + Date.now().toString().slice(-6),
      table, date: new Date().toLocaleDateString('fr-FR'),
      time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      method: this.payMethod, total,
      items: items.map(i => ({id:i.item.id,name:i.item.name,emoji:i.item.emoji,price:i.item.price,qty:i.qty}))
    });

    this.showEnc = false;
    this.sending.set(true);

    const payload = {
      tableNumber: table,
      items: items.map(i => ({ menuItemId: i.item.id, quantity: i.qty, note: i.note }))
    };

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.api.sendToKitchen(order.id).subscribe();
        const label = table === 0 ? '🥡 À emporter' : `Table ${table}`;
        this.sentMsg = `✓ Commande envoyée — ${label}`;
        this.cart.clear();
        this.sending.set(false);
        setTimeout(() => this.sentMsg = '', 3500);
      },
      error: () => {
        // Mode offline
        const label = table === 0 ? '🥡 À emporter' : `Table ${table}`;
        this.sentMsg = `✓ Commande enregistrée — ${label}`;
        this.cart.clear();
        this.sending.set(false);
        setTimeout(() => this.sentMsg = '', 3500);
      }
    });
  }

  openTicket() { /* TODO: modal ticket */ }
}
