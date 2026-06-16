import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { RestaurantTable, Order, HistoryEntry } from '../../models';

@Component({ selector:'app-tables', standalone:true, imports:[CommonModule, FormsModule],
  templateUrl:'./tables.component.html', styleUrl:'./tables.component.scss' })
export class TablesComponent implements OnInit, OnDestroy {
  tables      = signal<RestaurantTable[]>([]);
  selected    = signal<RestaurantTable | null>(null);
  tableOrders = signal<Order[]>([]);
  private timer: any;

  // Encaissement
  showEnc   = false;
  payMethod = 'especes';
  received  = 0;
  change: number | null = null;

  payMethods = [
    { key:'especes', icon:'💵', label:'Espèces' },
    { key:'carte',   icon:'💳', label:'Carte'   },
    { key:'cheque',  icon:'📝', label:'Chèque'  },
    { key:'mixte',   icon:'🔀', label:'Mixte'   },
  ];

  constructor(
    private api: ApiService,
    public  settings: SettingsService,
    private cart: CartService,
    private auth: AuthService
  ) {}

  ngOnInit()    { this.load(); this.timer = setInterval(() => this.load(), 10000); }
  ngOnDestroy() { clearInterval(this.timer); }

  load() { this.api.getTables().subscribe(t => this.tables.set(t)); }

  statusLabel(s: string): string {
    return s === 'FREE' ? 'Libre' : s === 'OCCUPIED' ? 'Occupée' : 'Réservée';
  }

  openDetail(table: RestaurantTable) {
    if (table.status !== 'OCCUPIED') return;
    this.selected.set(table);
    this.tableOrders.set([]);
    this.showEnc = false;
    this.api.getTableOrders(table.number).subscribe({
      next: orders => this.tableOrders.set(orders),
      error: () => {
        this.api.getActiveOrders().subscribe(all =>
          this.tableOrders.set(all.filter(o => o.tableNumber === table.number))
        );
      }
    });
  }

  get tableTotal(): number {
    return this.tableOrders().reduce((s, o) => s + (o.total || 0), 0);
  }

  close() { this.selected.set(null); this.showEnc = false; }

  // ── Ouvrir encaissement depuis la table ──────────
  openEncaissement() {
    this.showEnc  = true;
    this.payMethod = 'especes';
    this.received  = 0;
    this.change    = null;
  }

  calcChange() {
    const total = this.tableTotal;
    this.change = this.received >= total ? this.received - total : null;
  }

  // ── Valider l'encaissement + libérer la table ────
  confirmerEnc() {
    if (this.payMethod === 'especes' && this.received < this.tableTotal) {
      alert(`⚠ Montant insuffisant.\nTotal : ${this.settings.fmt(this.tableTotal)}`);
      return;
    }
    const table  = this.selected()!;
    const orders = this.tableOrders();
    const total  = this.tableTotal;

    // Sauvegarder dans l'historique
    const allItems: any[] = [];
    orders.forEach(o => {
      o.items.forEach(i => {
        const found = allItems.find(x => x.id === i.id && x.note === i.note);
        if (found) found.qty += i.quantity;
        else allItems.push({
          id: i.id, name: i.name, emoji: i.emoji,
          price: i.price, qty: i.quantity, note: i.note || ''
        });
      });
    });

    const entry: HistoryEntry = {
      id:     'F' + Date.now().toString().slice(-6),
      table:  table.number,
      date:   new Date().toLocaleDateString('fr-FR'),
      time:   new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      method: this.payMethod,
      total,
      status: 'paid',
      items:  allItems
    };
    this.cart.addToHistory(entry);

    // Marquer toutes les commandes comme SERVED
    const pending = orders.filter(o =>
      ['SENT','PREPARING','READY'].includes(o.status)
    );
    const markServed = pending.map(o =>
      this.api.updateOrderStatus(o.id, 'SERVED').toPromise()
    );

    Promise.all(markServed)
      .then(() => {
        // Table → FREE (le backend le fait aussi mais on force localement)
        this.tables.update(list =>
          list.map(t => t.number === table.number
            ? { ...t, status: 'FREE' as const }
            : t
          )
        );
        this.showEnc = false;
        this.close();
        // Recharger les tables depuis l'API
        setTimeout(() => this.load(), 500);
      })
      .catch(() => {
        // Fallback local même si API échoue
        this.tables.update(list =>
          list.map(t => t.number === table.number
            ? { ...t, status: 'FREE' as const }
            : t
          )
        );
        this.showEnc = false;
        this.close();
      });
  }
}
