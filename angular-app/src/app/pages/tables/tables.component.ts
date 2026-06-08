import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SettingsService } from '../../services/settings.service';
import { RestaurantTable, Order } from '../../models';

@Component({ selector:'app-tables', standalone:true, imports:[CommonModule],
  templateUrl:'./tables.component.html', styleUrl:'./tables.component.scss' })
export class TablesComponent implements OnInit {
  tables = signal<RestaurantTable[]>([]);
  orders = signal<Order[]>([]);
  selected = signal<RestaurantTable | null>(null);
  tableOrders = signal<Order[]>([]);

  constructor(private api: ApiService, public settings: SettingsService) {}

  ngOnInit() {
    this.api.getTables().subscribe(t => this.tables.set(t));
    this.api.getActiveOrders().subscribe(o => this.orders.set(o));
  }

  openDetail(table: RestaurantTable) {
    this.selected.set(table);
    this.api.getActiveOrders().subscribe(orders => {
      this.tableOrders.set(orders.filter(o => o.tableNumber === table.number));
    });
  }

  get tableTotal(): number {
    return this.tableOrders().reduce((s, o) => s + (o.total || 0), 0);
  }

  hasOrders(table: RestaurantTable): boolean {
    return this.orders().some(o => o.tableNumber === table.number);
  }

  close() { this.selected.set(null); }
}
