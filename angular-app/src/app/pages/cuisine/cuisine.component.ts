import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Order } from '../../models';

@Component({ selector:'app-cuisine', standalone:true, imports:[CommonModule],
  templateUrl:'./cuisine.component.html', styleUrl:'./cuisine.component.scss' })
export class CuisineComponent implements OnInit, OnDestroy {
  orders  = signal<Order[]>([]);
  loading = signal(true);
  lastUpdate = '';
  private timer: any;

  get sent()      { return this.orders().filter(o => o.status === 'SENT'); }
  get preparing() { return this.orders().filter(o => o.status === 'PREPARING'); }
  get ready()     { return this.orders().filter(o => o.status === 'READY'); }

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.load();
    // Polling toutes les 8 secondes (au lieu de 15)
    this.timer = setInterval(() => this.load(), 8000);
  }
  ngOnDestroy() { clearInterval(this.timer); }

  load() {
    this.api.getActiveOrders().subscribe({
      next: o => {
        this.orders.set(o);
        this.loading.set(false);
        this.lastUpdate = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
      },
      error: () => this.loading.set(false)
    });
  }

  action(id: number, status: string) {
    this.api.updateOrderStatus(id, status).subscribe(() => this.load());
  }

  tableLabel(order: Order): string {
    return order.tableNumber === 0 ? '🥡 EMPORTER' : `Table ${order.tableNumber}`;
  }
}
