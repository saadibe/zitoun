import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Order, OrderItem } from '../../models/restaurant.models';

// Type local pour la cuisine avec timestamp numérique
interface KitchenOrder {
  id: number;
  tableNumber: number;
  status: 'PENDING'|'SENT'|'PREPARING'|'READY'|'SERVED'|'CANCELLED';
  createdAt: string;
  timestamp: number;
  items: OrderItem[];
}

const MOCK_ORDERS: KitchenOrder[] = [
  {
    id: 1, tableNumber: 3, status: 'PREPARING',
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    timestamp: Date.now() - 8 * 60000,
    items: [
      { menuItem: { id: 4, name: 'Steak frites', price: 24, category: 'PLAT', emoji: '🥩', available: true }, quantity: 2 },
      { menuItem: { id: 1, name: 'Salade César', price: 12, category: 'ENTREE', emoji: '🥗', available: true }, quantity: 1, note: 'Sans croûtons' },
    ]
  },
  {
    id: 2, tableNumber: 7, status: 'SENT',
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    timestamp: Date.now() - 2 * 60000,
    items: [
      { menuItem: { id: 6, name: 'Pâtes carbonara', price: 17, category: 'PLAT', emoji: '🍝', available: true }, quantity: 3 },
      { menuItem: { id: 13, name: 'Bière pression', price: 5, category: 'BOISSON', emoji: '🍺', available: true }, quantity: 3 },
    ]
  },
  {
    id: 3, tableNumber: 1, status: 'READY',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    timestamp: Date.now() - 15 * 60000,
    items: [
      { menuItem: { id: 5, name: 'Poulet rôti', price: 19, category: 'PLAT', emoji: '🍗', available: true }, quantity: 2 },
      { menuItem: { id: 8, name: 'Crème brûlée', price: 8, category: 'DESSERT', emoji: '🍮', available: true }, quantity: 2 },
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
            <span class="count">{{ordersByStatus('SENT').length}}</span>
          </div>
          <div class="cards">
            @for (order of ordersByStatus('SENT'); track order.id) {
              <div class="order-card urgent">
                <div class="card-header">
                  <div>
                    <span class="table-badge">Table {{order.tableNumber}}</span>
                    <span class="time-ago">{{timeAgo(order.timestamp)}}</span>
                  </div>
                  <button class="action-btn accept" (click)="updateStatus(order, 'PREPARING')">
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
            @if (ordersByStatus('SENT').length === 0) {
              <div class="empty-col">Aucune nouvelle commande</div>
            }
          </div>
        </div>

        <!-- PREPARING -->
        <div class="column">
          <div class="column-header preparing">
            <span class="dot"></span>
            En préparation
            <span class="count">{{ordersByStatus('PREPARING').length}}</span>
          </div>
          <div class="cards">
            @for (order of ordersByStatus('PREPARING'); track order.id) {
              <div class="order-card">
                <div class="card-header">
                  <div>
                    <span class="table-badge">Table {{order.tableNumber}}</span>
                    <span class="time-ago">{{timeAgo(order.timestamp)}}</span>
                  </div>
                  <button class="action-btn ready" (click)="updateStatus(order, 'READY')">
                    🔔 Prêt
                  </button>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width]="getProgress(order.timestamp)"></div>
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
            @if (ordersByStatus('PREPARING').length === 0) {
              <div class="empty-col">Aucune commande en cours</div>
            }
          </div>
        </div>

        <!-- READY -->
        <div class="column">
          <div class="column-header ready">
            <span class="dot"></span>
            Prêtes à servir
            <span class="count">{{ordersByStatus('READY').length}}</span>
          </div>
          <div class="cards">
            @for (order of ordersByStatus('READY'); track order.id) {
              <div class="order-card glow-green">
                <div class="card-header">
                  <div>
                    <span class="table-badge">Table {{order.tableNumber}}</span>
                    <span class="time-ago ready-tag">🟢 PRÊT</span>
                  </div>
                  <button class="action-btn serve" (click)="updateStatus(order, 'SERVED')">
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
            @if (ordersByStatus('READY').length === 0) {
              <div class="empty-col">Aucune commande prête</div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kitchen-layout { display: flex; flex-direction: column; height: 100vh; background: var(--ivory, #faf9f6); color: var(--ink, #1a2618); font-family: 'Cairo', sans-serif; }
    .kitchen-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 28px; border-bottom: 2px solid var(--border, #d4dfd2); background: white; }
    h1 { font-size: 20px; font-weight: 800; margin: 0 0 2px; }
    .kitchen-header p { font-size: 13px; color: var(--ink3, #7a9476); margin: 0; }
    .header-actions { display: flex; align-items: center; gap: 16px; }
    .time-display { font-size: 20px; font-weight: 700; color: var(--sky, #3d7a47); font-variant-numeric: tabular-nums; }
    .refresh-btn { padding: 7px 14px; border-radius: 8px; border: 1.5px solid var(--border, #d4dfd2); background: white; font-size: 13px; cursor: pointer; font-family: 'Cairo', sans-serif; }
    .columns { display: grid; grid-template-columns: 1fr 1fr 1fr; flex: 1; overflow: hidden; gap: 1px; background: var(--border, #d4dfd2); }
    .column { display: flex; flex-direction: column; background: var(--ivory, #faf9f6); overflow: hidden; }
    .column-header { display: flex; align-items: center; gap: 8px; padding: 13px 18px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-bottom: 3px solid; }
    .column-header.new { color: var(--terracotta, #b85c38); border-color: var(--terracotta, #b85c38); background: rgba(184,92,56,.05); }
    .column-header.preparing { color: #a06000; border-color: var(--yellow, #c49a1a); background: rgba(196,154,26,.05); }
    .column-header.ready { color: var(--green, #2e7d52); border-color: var(--green, #2e7d52); background: rgba(46,125,82,.05); }
    .dot { width: 8px; height: 8px; border-radius: 50%; animation: blink 1.3s infinite; }
    .new .dot { background: var(--terracotta, #b85c38); }
    .preparing .dot { background: var(--yellow, #c49a1a); }
    .ready .dot { background: var(--green, #2e7d52); animation: none; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
    .count { margin-left: auto; background: rgba(255,255,255,.7); border-radius: 20px; padding: 2px 9px; font-size: 11px; }
    .cards { flex: 1; overflow-y: auto; padding: 13px; display: flex; flex-direction: column; gap: 10px; }
    .empty-col { color: var(--ink4, #b0c4ac); font-size: 13px; text-align: center; padding: 32px 0; font-style: italic; }
    .order-card { background: white; border: 2px solid var(--border, #d4dfd2); border-radius: 14px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.04); animation: kci .2s ease; }
    @keyframes kci { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .order-card.urgent { border-color: var(--terracotta, #b85c38); border-left-width: 4px; }
    .order-card.glow-green { border-color: var(--green, #2e7d52); border-left-width: 4px; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
    .table-badge { font-size: 17px; font-weight: 900; color: var(--ink, #1a2618); display: block; }
    .time-ago { font-size: 11px; color: var(--ink3, #7a9476); }
    .ready-tag { font-size: 11px; color: var(--green, #2e7d52); font-weight: 700; }
    .action-btn { padding: 6px 13px; border-radius: 8px; border: 2px solid; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: 'Cairo', sans-serif; }
    .action-btn.accept { background: rgba(184,92,56,.1); color: var(--terracotta, #b85c38); border-color: var(--terracotta, #b85c38); }
    .action-btn.accept:hover { background: var(--terracotta, #b85c38); color: white; }
    .action-btn.ready { background: rgba(196,154,26,.1); color: #a06000; border-color: var(--yellow, #c49a1a); }
    .action-btn.ready:hover { background: var(--yellow, #c49a1a); color: black; }
    .action-btn.serve { background: rgba(46,125,82,.1); color: var(--green, #2e7d52); border-color: var(--green, #2e7d52); }
    .action-btn.serve:hover { background: var(--green, #2e7d52); color: white; }
    .progress-bar { height: 4px; background: var(--cream, #f2ede3); border-radius: 2px; margin-bottom: 10px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--sky, #3d7a47), var(--terracotta, #b85c38)); border-radius: 2px; transition: width 1s; }
    .items-list { display: flex; flex-direction: column; gap: 6px; }
    .order-line { display: flex; align-items: flex-start; gap: 8px; font-size: 13.5px; color: var(--ink2, #3a5236); }
    .qty-badge { font-size: 11px; font-weight: 800; background: var(--sky-pale, #edf7ef); color: var(--sky, #3d7a47); border: 1.5px solid var(--sky-light, #c8e6cd); padding: 1px 7px; border-radius: 6px; flex-shrink: 0; margin-top: 2px; }
    .item-emoji { flex-shrink: 0; }
    .note { font-size: 11px; color: var(--ink3, #7a9476); font-style: italic; display: block; margin-top: 2px; }
  `]
})
export class KitchenComponent implements OnInit, OnDestroy {
  private _orders = signal<KitchenOrder[]>(MOCK_ORDERS);
  private _time = signal(new Date());
  private timer: any;

  ngOnInit() { this.timer = setInterval(() => this._time.set(new Date()), 1000); }
  ngOnDestroy() { clearInterval(this.timer); }

  currentTime() {
    return this._time().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  pendingCount() {
    return this._orders().filter(o => o.status === 'SENT' || o.status === 'PREPARING').length;
  }

  ordersByStatus(status: string): KitchenOrder[] {
    return this._orders().filter(o => o.status === status);
  }

  loadOrders() { /* In production: call API */ }

  updateStatus(order: KitchenOrder, newStatus: 'PENDING'|'SENT'|'PREPARING'|'READY'|'SERVED'|'CANCELLED') {
    this._orders.set(this._orders().map(o =>
      o.id === order.id ? { ...o, status: newStatus } : o
    ));
  }

  timeAgo(timestamp: number): string {
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 1) return "À l'instant";
    return `Il y a ${mins} min`;
  }

  getProgress(timestamp: number): string {
    const target = 15 * 60 * 1000;
    const elapsed = Date.now() - timestamp;
    const pct = Math.min(100, (elapsed / target) * 100);
    return `${pct}%`;
  }
}
