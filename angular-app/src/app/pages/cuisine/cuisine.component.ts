import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Order } from '../../models';

@Component({ selector:'app-cuisine', standalone:true, imports:[CommonModule],
  templateUrl:'./cuisine.component.html', styleUrl:'./cuisine.component.scss' })
export class CuisineComponent implements OnInit, OnDestroy {
  orders = signal<Order[]>([]);
  private timer: any;

  get sent()     { return this.orders().filter(o => o.status === 'SENT'); }
  get preparing(){ return this.orders().filter(o => o.status === 'PREPARING'); }
  get ready()    { return this.orders().filter(o => o.status === 'READY'); }

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), 15000);
  }
  ngOnDestroy() { clearInterval(this.timer); }

  load() { this.api.getActiveOrders().subscribe(o => this.orders.set(o)); }

  action(id: number, status: string) {
    this.api.updateOrderStatus(id, status).subscribe(() => this.load());
  }

  tableLabel(order: Order): string {
    return order.tableNumber === 0 ? '🥡 EMPORTER' : `Table ${order.tableNumber}`;
  }
}
