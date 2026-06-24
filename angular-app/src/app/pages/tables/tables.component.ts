import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { RestaurantTable, Order, HistoryEntry } from '../../models';

@Component({ selector:'app-tables', standalone:true, imports:[CommonModule, FormsModule],
  templateUrl:'./tables.component.html', styleUrl:'./tables.component.scss' })
export class TablesComponent implements OnInit, OnDestroy {
  tables      = signal<RestaurantTable[]>([]);
  selected    = signal<RestaurantTable | null>(null);
  tableOrders = signal<Order[]>([]);
  loadingOrders = false;
  private timer: any;

  showEnc    = false;
  payMethod  = 'especes';
  received   = 0;
  change: number | null = null;
  processing = false;

  payMethods = [
    { key:'especes', icon:'💵', label:'Espèces' },
    { key:'carte',   icon:'💳', label:'Carte'   },
    { key:'cheque',  icon:'📝', label:'Chèque'  },
    { key:'mixte',   icon:'🔀', label:'Mixte'   },
  ];

  constructor(
    private api: ApiService,
    public  settings: SettingsService,
    private cart: CartService
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
    this.showEnc      = false;
    this.processing   = false;
    this.loadingOrders = true;

    this.api.getTableOrders(table.number).subscribe({
      next: orders => {
        this.tableOrders.set(orders);
        this.loadingOrders = false;
      },
      error: () => {
        // Fallback : charger toutes les commandes actives
        this.api.getActiveOrders().subscribe({
          next: all => {
            this.tableOrders.set(all.filter(o => o.tableNumber === table.number));
            this.loadingOrders = false;
          },
          error: () => { this.loadingOrders = false; }
        });
      }
    });
  }

  get tableTotal(): number {
    return this.tableOrders().reduce((s, o) => s + (o.total || 0), 0);
  }

  close() { this.selected.set(null); this.showEnc = false; }

  openEncaissement() {
    if (this.tableOrders().length === 0) {
      alert('⚠ Aucune commande trouvée pour cette table.');
      return;
    }
    this.showEnc   = true;
    this.payMethod = 'especes';
    this.received  = 0;
    this.change    = null;
  }

  calcChange() {
    this.change = this.received >= this.tableTotal
      ? this.received - this.tableTotal : null;
  }

  confirmerEnc() {
    // Guards
    if (this.tableOrders().length === 0) {
      alert('⚠ Impossible : aucune commande chargée.');
      return;
    }
    if (this.tableTotal <= 0) {
      alert('⚠ Total à 0 — rechargez les commandes.');
      return;
    }
    if (this.payMethod === 'especes' && this.received < this.tableTotal) {
      alert(`⚠ Montant insuffisant.\nTotal : ${this.settings.fmt(this.tableTotal)}`);
      return;
    }

    const table  = this.selected()!;
    this.processing = true;

    // Appel API payTable → marque toutes les commandes SERVED + libère table en base
    this.api.payTable(table.number, this.payMethod).subscribe({
      next: () => {
        // Sauvegarder dans l'historique
        const allItems: any[] = [];
        this.tableOrders().forEach(o => o.items.forEach(i => {
          const found = allItems.find(x => x.name === i.name && x.note === (i.note||''));
          if (found) found.qty += i.quantity;
          else allItems.push({
            id: i.id, name: i.name, emoji: i.emoji,
            price: i.price, qty: i.quantity, note: i.note||''
          });
        }));
        const entry: HistoryEntry = {
          id:     'F' + Date.now().toString().slice(-6),
          table:  table.number,
          date:   new Date().toLocaleDateString('fr-FR'),
          time:   new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}),
          method: this.payMethod,
          total:  this.tableTotal,
          status: 'paid',
          items:  allItems
        };
        this.cart.addToHistory(entry);

        // Libérer la table localement immédiatement
        this.tables.update(list =>
          list.map(t => t.number === table.number ? { ...t, status: 'FREE' as const } : t)
        );
        this.processing = false;
        this.close();
        // Recharger depuis API pour confirmer
        setTimeout(() => this.load(), 1000);
      },
      error: (err) => {
        this.processing = false;
        alert(`⚠ Erreur lors de l'encaissement.\nVérifiez la connexion et réessayez.`);
        console.error('payTable error:', err);
      }
    });
  }
}
