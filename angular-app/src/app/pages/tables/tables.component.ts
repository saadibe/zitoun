import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SettingsService } from '../../services/settings.service';
import { RestaurantTable, Order } from '../../models';

@Component({ selector:'app-tables', standalone:true, imports:[CommonModule],
  templateUrl:'./tables.component.html', styleUrl:'./tables.component.scss' })
export class TablesComponent implements OnInit, OnDestroy {
  tables      = signal<RestaurantTable[]>([]);
  selected    = signal<RestaurantTable | null>(null);
  tableOrders = signal<Order[]>([]);
  loading     = false;
  private timer: any;

  constructor(private api: ApiService, public settings: SettingsService) {}

  ngOnInit()    { this.load(); this.timer = setInterval(() => this.load(), 15000); }
  ngOnDestroy() { clearInterval(this.timer); }

  load() {
    this.api.getTables().subscribe(t => this.tables.set(t));
  }

  statusLabel(s: string): string {
    return s === 'FREE' ? 'Libre' : s === 'OCCUPIED' ? 'Occupée' : 'Réservée';
  }

  statusClass(s: string): string {
    return s === 'FREE' ? 'free' : s === 'OCCUPIED' ? 'occupied' : 'reserved';
  }

  openDetail(table: RestaurantTable) {
    if (table.status !== 'OCCUPIED') return;
    this.selected.set(table);
    this.tableOrders.set([]);
    // Charger les commandes actives de cette table
    this.api.getTableOrders(table.number).subscribe({
      next: orders => this.tableOrders.set(orders),
      error: () => {
        // Fallback : filtrer depuis getActiveOrders
        this.api.getActiveOrders().subscribe(all => {
          this.tableOrders.set(all.filter(o => o.tableNumber === table.number));
        });
      }
    });
  }

  get tableTotal(): number {
    return this.tableOrders().reduce((s, o) => s + (o.total || 0), 0);
  }

  close() { this.selected.set(null); }
}
