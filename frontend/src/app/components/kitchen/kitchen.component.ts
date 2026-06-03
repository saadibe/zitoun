import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Order } from '../../models/restaurant.models';

const MOCK_ORDERS: Order[] = [
  {
    id: 1, tableNumber: 3, status: 'preparing',
    createdAt: new Date(Date.now() - 8 * 60000),
    items: [
      { menuItem: { id: 4, name: 'Steak frites', price: 24, category: 'plat', emoji: '🥩', available: true }, quantity: 2 },
      { menuItem: { id: 1, name: 'Salade César', price: 12, category: 'entree', emoji: '🥗', available: true }, quantity: 1, note: 'Sans croûtons' },
    ]
  },
  {
    id: 2, tableNumber: 7, status: 'sent',
    createdAt: new Date(Date.now() - 2 * 60000),
    items: [
      { menuItem: { id: 6, name: 'Pâtes carbonara', price: 17, category: 'plat', emoji: '🍝', available: true }, quantity: 3 },
      { menuItem: { id: 13, name: 'Bière pression', price: 5, category: 'boisson', emoji: '🍺', available: true }, quantity: 3 },
    ]
  },
  {
    id: 3, tableNumber: 1, status: 'ready',
    createdAt: new Date(Date.now() - 15 * 60000),
    items: [
      { menuItem: { id: 5, name: 'Poulet rôti', price: 19, category: 'plat', emoji: '🍗', available: true }, quantity: 2 },
      { menuItem: { id: 8, name: 'Crème brûlée', price: 8, category: 'dessert', emoji: '🍮', available: true }, quantity: 2 },
    ]
  },
];

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kitchen-layout">
      <div class="kitchen-header">
        <div>
          <h1>🍳 Cuisine</h1>
          <p>{{pendingCount()}} commande(s) en attente</p>
        </div>
        <div class="header-actions">
          <div class="time-display">{{currentTime()}}</div>
          <button class="refresh-btn" (click)="loadOrders()">🔄 Actualiser</button>
        </div>
      </div>

      <div class="columns">
        <!-- NEW -->
        <div class="column">
          <div class="column-header new">
            <span class="dot"></span>
            Nouvelles
            <span class="count">{{ordersByStatus('sent').length}}</span>
          </div>
          <div class="cards">
            @for (order of ordersByStatus('sent'); track order.id) {
              <div class="order-card urgent" [class.flash]="isNew(order)">
                <div class="card-header">
                  <div>
                    <span class="table-badge">Table {{order.tableNumber}}</span>
                    <span class="time-ago">{{timeAgo(order.createdAt!)}}</span>
                  </div>
                  <button class="action-btn accept" (click)="updateStatus(order, 'preparing')">
                    ✅ Accepter
                  </button>
                </div>
                <div class="items-list">
                  @for (item of order.items; track item.menuItem.id) {
                    <div class="order-line">
                      <span class="qty-badge">×{{item.quantity}}</span>
                      <span class="item-emoji">{{item.menuItem.emoji}}</span>
                      <div>
                        <span>{{item.menuItem.name}}</span>
                        @if (item.note) {
                          <span class="note">📝 {{item.note}}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
            @if (ordersByStatus('sent').length === 0) {
              <div class="empty-col">Aucune nouvelle commande</div>
            }
          </div>
        </div>

        <!-- PREPARING -->
        <div class="column">
          <div class="column-header preparing">
            <span class="dot"></span>
            En préparation
            <span class="count">{{ordersByStatus('preparing').length}}</span>
          </div>
          <div class="cards">
            @for (order of ordersByStatus('preparing'); track order.id) {
              <div class="order-card">
                <div class="card-header">
                  <div>
                    <span class="table-badge">Table {{order.tableNumber}}</span>
                    <span class="time-ago">{{timeAgo(order.createdAt!)}}</span>
                  </div>
                  <button class="action-btn ready" (click)="updateStatus(order, 'ready')">
                    🔔 Prêt
                  </button>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width]="getProgress(order.createdAt!)"></div>
                </div>
                <div class="items-list">
                  @for (item of order.items; track item.menuItem.id) {
                    <div class="order-line">
                      <span class="qty-badge">×{{item.quantity}}</span>
                      <span class="item-emoji">{{item.menuItem.emoji}}</span>
                      <div>
                        <span>{{item.menuItem.name}}</span>
                        @if (item.note) {
                          <span class="note">📝 {{item.note}}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
            @if (ordersByStatus('preparing').length === 0) {
              <div class="empty-col">Aucune commande en cours</div>
            }
          </div>
        </div>

        <!-- READY -->
        <div class="column">
          <div class="column-header ready">
            <span class="dot"></span>
            Prêtes à servir
            <span class="count">{{ordersByStatus('ready').length}}</span>
          </div>
          <div class="cards">
            @for (order of ordersByStatus('ready'); track order.id) {
              <div class="order-card glow-green">
                <div class="card-header">
                  <div>
                    <span class="table-badge">Table {{order.tableNumber}}</span>
                    <span class="time-ago ready-tag">🟢 PRÊT</span>
                  </div>
                  <button class="action-btn serve" (click)="updateStatus(order, 'served')">
                    ✓ Servi
                  </button>
                </div>
                <div class="items-list">
                  @for (item of order.items; track item.menuItem.id) {
                    <div class="order-line">
                      <span class="qty-badge">×{{item.quantity}}</span>
                      <span class="item-emoji">{{item.menuItem.emoji}}</span>
                      <span>{{item.menuItem.name}}</span>
                    </div>
                  }
                </div>
              </div>
            }
            @if (ordersByStatus('ready').length === 0) {
              <div class="empty-col">Aucune commande prête</div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kitchen-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #0a0a0a;
      color: #e0e0e0;
      font-family: 'DM Sans', sans-serif;
    }
    .kitchen-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 28px;
      border-bottom: 1px solid #1e1e1e;
      background: #111;
    }
    h1 { font-size: 22px; font-weight: 800; color: #fff; margin: 0 0 2px; }
    .kitchen-header p { font-size: 13px; color: #666; margin: 0; }
    .header-actions { display: flex; align-items: center; gap: 16px; }
    .time-display {
      font-size: 20px;
      font-weight: 700;
      color: #f59e0b;
      font-variant-numeric: tabular-nums;
    }
    .refresh-btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #2a2a2a;
      background: #1a1a1a;
      color: #888;
      font-size: 13px;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.15s;
    }
    .refresh-btn:hover { border-color: #444; color: #ccc; }

    .columns {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1px;
      flex: 1;
      overflow: hidden;
      background: #1a1a1a;
    }
    .column {
      display: flex;
      flex-direction: column;
      background: #0f0f0f;
      overflow: hidden;
    }
    .column-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 20px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 2px solid;
    }
    .column-header.new { color: #ef4444; border-color: #ef4444; }
    .column-header.preparing { color: #f59e0b; border-color: #f59e0b; }
    .column-header.ready { color: #22c55e; border-color: #22c55e; }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      animation: blink 1.5s infinite;
    }
    .new .dot { background: #ef4444; }
    .preparing .dot { background: #f59e0b; }
    .ready .dot { background: #22c55e; animation: none; }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
    .count {
      margin-left: auto;
      background: #1f1f1f;
      border-radius: 20px;
      padding: 1px 10px;
      font-size: 12px;
      font-weight: 800;
    }

    .cards {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .order-card {
      background: #171717;
      border: 1px solid #252525;
      border-radius: 14px;
      padding: 14px;
      animation: cardIn 0.25s ease;
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .order-card.urgent { border-color: #ef444440; box-shadow: 0 0 20px #ef444415; }
    .order-card.glow-green { border-color: #22c55e40; box-shadow: 0 0 20px #22c55e15; }
    .order-card.flash { animation: flash 0.5s ease 2; }
    @keyframes flash {
      0%, 100% { background: #171717; }
      50% { background: #2a1515; }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 8px;
    }
    .table-badge {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
      display: block;
    }
    .time-ago { font-size: 11px; color: #555; }
    .ready-tag { font-size: 11px; color: #22c55e !important; font-weight: 700; }

    .action-btn {
      padding: 7px 14px;
      border-radius: 8px;
      border: none;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.15s;
    }
    .action-btn.accept { background: #ef4444; color: #fff; }
    .action-btn.accept:hover { background: #dc2626; }
    .action-btn.ready { background: #f59e0b; color: #000; }
    .action-btn.ready:hover { background: #fbbf24; }
    .action-btn.serve { background: #22c55e; color: #000; }
    .action-btn.serve:hover { background: #16a34a; }

    .progress-bar {
      height: 3px;
      background: #252525;
      border-radius: 2px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #f59e0b, #ef4444);
      border-radius: 2px;
      transition: width 0.5s;
    }

    .items-list { display: flex; flex-direction: column; gap: 7px; }
    .order-line {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 14px;
      color: #ccc;
    }
    .qty-badge {
      font-size: 12px;
      font-weight: 800;
      background: #252525;
      padding: 2px 6px;
      border-radius: 6px;
      color: #f59e0b;
      flex-shrink: 0;
    }
    .item-emoji { flex-shrink: 0; }
    .note {
      font-size: 11px;
      color: #888;
      font-style: italic;
      display: block;
      margin-top: 2px;
    }

    .empty-col {
      color: #333;
      font-size: 13px;
      text-align: center;
      padding: 30px 0;
    }
  `]
})
export class KitchenComponent implements OnInit, OnDestroy {
  private _orders = signal<Order[]>(MOCK_ORDERS);
  private _time = signal(new Date());
  private timer: any;

  ngOnInit() {
    this.timer = setInterval(() => this._time.set(new Date()), 1000);
  }
  ngOnDestroy() { clearInterval(this.timer); }

  currentTime() {
    return this._time().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  pendingCount() {
    return this._orders().filter(o => o.status === 'sent' || o.status === 'preparing').length;
  }

  ordersByStatus(status: string): Order[] {
    return this._orders().filter(o => o.status === status);
  }

  loadOrders() {
    // In production: this.restaurantService.getOrders().subscribe(...)
  }

  updateStatus(order: Order, newStatus: Order['status']) {
    this._orders.set(this._orders().map(o =>
      o.id === order.id ? { ...o, status: newStatus } : o
    ));
  }

  isNew(order: Order): boolean {
    if (!order.createdAt) return false;
    return (Date.now() - order.createdAt.getTime()) < 30000;
  }

  timeAgo(date: Date): string {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'À l\'instant';
    return `Il y a ${mins} min`;
  }

  getProgress(date: Date): string {
    const target = 15 * 60 * 1000; // 15 min target
    const elapsed = Date.now() - date.getTime();
    const pct = Math.min(100, (elapsed / target) * 100);
    return `${pct}%`;
  }
}
