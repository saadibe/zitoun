import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MenuItem, OrderItem, Order } from '../../models/restaurant.models';
import { RestaurantService } from '../../services/restaurant.service';

const MOCK_MENU: MenuItem[] = [
  { id: 1, name: 'Salade César', price: 12, category: 'entree', emoji: '🥗', available: true },
  { id: 2, name: 'Soupe à l\'oignon', price: 9, category: 'entree', emoji: '🍲', available: true },
  { id: 3, name: 'Tartare de saumon', price: 15, category: 'entree', emoji: '🐟', available: true },
  { id: 4, name: 'Steak frites', price: 24, category: 'plat', emoji: '🥩', available: true },
  { id: 5, name: 'Poulet rôti', price: 19, category: 'plat', emoji: '🍗', available: true },
  { id: 6, name: 'Pâtes carbonara', price: 17, category: 'plat', emoji: '🍝', available: true },
  { id: 7, name: 'Saumon grillé', price: 22, category: 'plat', emoji: '🐠', available: false },
  { id: 8, name: 'Crème brûlée', price: 8, category: 'dessert', emoji: '🍮', available: true },
  { id: 9, name: 'Fondant chocolat', price: 9, category: 'dessert', emoji: '🍫', available: true },
  { id: 10, name: 'Tarte tatin', price: 8, category: 'dessert', emoji: '🥧', available: true },
  { id: 11, name: 'Eau minérale', price: 3, category: 'boisson', emoji: '💧', available: true },
  { id: 12, name: 'Vin rouge (verre)', price: 6, category: 'boisson', emoji: '🍷', available: true },
  { id: 13, name: 'Bière pression', price: 5, category: 'boisson', emoji: '🍺', available: true },
  { id: 14, name: 'Café', price: 3, category: 'boisson', emoji: '☕', available: true },
];

@Component({
  selector: 'app-server-order',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="order-layout">
      <!-- LEFT: Menu -->
      <div class="menu-panel">
        <div class="panel-header">
          <div>
            <h2>Menu</h2>
            <p class="subtitle">Sélectionnez les plats</p>
          </div>
          <div class="table-selector">
            <label>Table</label>
            <div class="table-buttons">
              @for (t of tables; track t) {
                <button 
                  class="table-btn" 
                  [class.selected]="selectedTable === t"
                  (click)="selectedTable = t">
                  {{t}}
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Category tabs -->
        <div class="category-tabs">
          @for (cat of categories; track cat.key) {
            <button 
              class="cat-tab"
              [class.active]="activeCategory === cat.key"
              (click)="activeCategory = cat.key">
              <span>{{cat.emoji}}</span>
              {{cat.label}}
            </button>
          }
        </div>

        <!-- Menu Items Grid -->
        <div class="menu-grid">
          @for (item of filteredMenu(); track item.id) {
            <button 
              class="menu-item"
              [class.unavailable]="!item.available"
              [disabled]="!item.available"
              (click)="addToOrder(item)">
              <span class="item-emoji">{{item.emoji}}</span>
              <span class="item-name">{{item.name}}</span>
              <span class="item-price">{{item.price}}€</span>
              @if (!item.available) {
                <span class="unavailable-badge">Indisponible</span>
              }
            </button>
          }
        </div>
      </div>

      <!-- RIGHT: Order Summary -->
      <div class="order-panel">
        <div class="panel-header">
          <div>
            <h2>Commande</h2>
            <p class="subtitle">
              @if (selectedTable) { Table {{selectedTable}} } @else { Choisir une table }
            </p>
          </div>
          <button class="clear-btn" (click)="clearOrder()" [disabled]="orderItems().length === 0">
            Vider
          </button>
        </div>

        <div class="order-items">
          @if (orderItems().length === 0) {
            <div class="empty-order">
              <span>🛒</span>
              <p>Aucun article sélectionné</p>
            </div>
          }
          @for (item of orderItems(); track item.menuItem.id) {
            <div class="order-item">
              <div class="order-item-info">
                <span class="order-emoji">{{item.menuItem.emoji}}</span>
                <div>
                  <span class="order-name">{{item.menuItem.name}}</span>
                  <input 
                    class="note-input"
                    placeholder="Note (sans sel...)"
                    [(ngModel)]="item.note">
                </div>
              </div>
              <div class="order-item-controls">
                <button class="qty-btn" (click)="decreaseQty(item)">−</button>
                <span class="qty">{{item.quantity}}</span>
                <button class="qty-btn" (click)="increaseQty(item)">+</button>
                <span class="item-total">{{item.menuItem.price * item.quantity}}€</span>
              </div>
            </div>
          }
        </div>

        <!-- Total -->
        <div class="order-footer">
          <div class="total-row">
            <span>Total</span>
            <span class="total-amount">{{total()}}€</span>
          </div>

          @if (successMsg) {
            <div class="success-banner">✅ {{successMsg}}</div>
          }

          <div class="action-buttons">
            <button 
              class="btn-print"
              [disabled]="orderItems().length === 0 || !selectedTable"
              (click)="printOrder()">
              🖨️ Imprimer
            </button>
            <button 
              class="btn-send"
              [disabled]="orderItems().length === 0 || !selectedTable || sending"
              (click)="sendToKitchen()">
              @if (sending) { ⏳ Envoi... } @else { 👨‍🍳 Envoyer en cuisine }
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .order-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      height: 100vh;
      background: #0f0f0f;
      color: #e0e0e0;
      font-family: 'DM Sans', sans-serif;
    }

    /* PANEL SHARED */
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px 24px 16px;
      border-bottom: 1px solid #2a2a2a;
    }
    h2 { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 2px; }
    .subtitle { font-size: 12px; color: #666; margin: 0; }

    /* MENU PANEL */
    .menu-panel {
      display: flex;
      flex-direction: column;
      border-right: 1px solid #2a2a2a;
      overflow: hidden;
    }

    .table-selector {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
    .table-selector label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .table-buttons { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .table-btn {
      width: 36px; height: 36px;
      border-radius: 8px;
      border: 1px solid #2a2a2a;
      background: #1a1a1a;
      color: #888;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .table-btn:hover { border-color: #f59e0b; color: #f59e0b; }
    .table-btn.selected { background: #f59e0b; border-color: #f59e0b; color: #000; }

    .category-tabs {
      display: flex;
      gap: 6px;
      padding: 14px 24px;
      border-bottom: 1px solid #2a2a2a;
    }
    .cat-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 20px;
      border: 1px solid #2a2a2a;
      background: transparent;
      color: #666;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'DM Sans', sans-serif;
    }
    .cat-tab:hover { border-color: #444; color: #ccc; }
    .cat-tab.active { background: #f59e0b20; border-color: #f59e0b; color: #f59e0b; }

    .menu-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
    }
    .menu-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      padding: 16px;
      border-radius: 14px;
      border: 1px solid #2a2a2a;
      background: #1a1a1a;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
      font-family: 'DM Sans', sans-serif;
    }
    .menu-item:hover:not([disabled]) {
      border-color: #f59e0b;
      background: #1f1f1f;
      transform: translateY(-2px);
    }
    .menu-item:active:not([disabled]) { transform: scale(0.97); }
    .menu-item.unavailable { opacity: 0.4; cursor: not-allowed; }
    .item-emoji { font-size: 28px; }
    .item-name { font-size: 13px; font-weight: 600; color: #e0e0e0; line-height: 1.3; }
    .item-price { font-size: 14px; font-weight: 700; color: #f59e0b; margin-top: auto; }
    .unavailable-badge {
      position: absolute;
      top: 8px; right: 8px;
      font-size: 10px;
      background: #3a2020;
      color: #ef4444;
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* ORDER PANEL */
    .order-panel {
      display: flex;
      flex-direction: column;
      background: #141414;
    }
    .clear-btn {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #3a2020;
      background: transparent;
      color: #ef4444;
      font-size: 12px;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.15s;
    }
    .clear-btn:hover:not([disabled]) { background: #3a2020; }
    .clear-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .order-items {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .empty-order {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      height: 100%;
      color: #444;
    }
    .empty-order span { font-size: 40px; }
    .empty-order p { font-size: 14px; }

    .order-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border-radius: 12px;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .order-item-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .order-emoji { font-size: 22px; flex-shrink: 0; }
    .order-name { font-size: 13px; font-weight: 600; color: #e0e0e0; display: block; }
    .note-input {
      width: 100%;
      background: transparent;
      border: none;
      border-bottom: 1px dashed #333;
      color: #888;
      font-size: 11px;
      padding: 3px 0;
      outline: none;
      font-family: 'DM Sans', sans-serif;
      box-sizing: border-box;
    }
    .note-input::placeholder { color: #444; }
    .order-item-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;
    }
    .qty-btn {
      width: 28px; height: 28px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #252525;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.1s;
    }
    .qty-btn:hover { background: #333; border-color: #f59e0b; }
    .qty { font-size: 14px; font-weight: 700; color: #fff; min-width: 20px; text-align: center; }
    .item-total { font-size: 13px; font-weight: 700; color: #f59e0b; margin-left: auto; }

    .order-footer {
      padding: 16px;
      border-top: 1px solid #2a2a2a;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }
    .total-amount { font-size: 22px; color: #f59e0b; }

    .success-banner {
      background: #14532d30;
      border: 1px solid #22c55e40;
      color: #22c55e;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      text-align: center;
    }

    .action-buttons { display: flex; gap: 8px; }
    .btn-print, .btn-send {
      flex: 1;
      padding: 13px;
      border-radius: 12px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
    }
    .btn-print {
      background: #252525;
      color: #ccc;
      border: 1px solid #333;
    }
    .btn-print:hover:not([disabled]) { background: #333; }
    .btn-send {
      background: #f59e0b;
      color: #000;
    }
    .btn-send:hover:not([disabled]) { background: #fbbf24; transform: translateY(-1px); }
    .btn-send:disabled, .btn-print:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  `]
})
export class ServerOrderComponent implements OnInit {
  tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  selectedTable: number | null = null;
  activeCategory: string = 'all';
  sending = false;
  successMsg = '';

  menu = MOCK_MENU;
  private _orderItems = signal<OrderItem[]>([]);
  orderItems = this._orderItems.asReadonly();

  categories = [
    { key: 'all', label: 'Tout', emoji: '🍽️' },
    { key: 'entree', label: 'Entrées', emoji: '🥗' },
    { key: 'plat', label: 'Plats', emoji: '🥩' },
    { key: 'dessert', label: 'Desserts', emoji: '🍮' },
    { key: 'boisson', label: 'Boissons', emoji: '🍷' },
  ];

  filteredMenu = computed(() =>
    this.activeCategory === 'all'
      ? this.menu
      : this.menu.filter(m => m.category === this.activeCategory)
  );

  total = computed(() =>
    this._orderItems().reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0)
  );

  constructor(private restaurantService: RestaurantService) {}

  ngOnInit() {
    // In production: this.restaurantService.getMenu().subscribe(m => this.menu = m);
  }

  addToOrder(item: MenuItem) {
    const current = this._orderItems();
    const existing = current.find(i => i.menuItem.id === item.id);
    if (existing) {
      this._orderItems.set(current.map(i =>
        i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      this._orderItems.set([...current, { menuItem: item, quantity: 1 }]);
    }
  }

  increaseQty(item: OrderItem) {
    this._orderItems.set(this._orderItems().map(i =>
      i.menuItem.id === item.menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
    ));
  }

  decreaseQty(item: OrderItem) {
    const updated = this._orderItems()
      .map(i => i.menuItem.id === item.menuItem.id ? { ...i, quantity: i.quantity - 1 } : i)
      .filter(i => i.quantity > 0);
    this._orderItems.set(updated);
  }

  clearOrder() {
    this._orderItems.set([]);
    this.successMsg = '';
  }

  sendToKitchen() {
    if (!this.selectedTable) return;
    this.sending = true;
    const order: Partial<Order> = {
      tableNumber: this.selectedTable,
      items: this._orderItems(),
      status: 'sent'
    };
    // In production: this.restaurantService.createOrder(order).subscribe(...)
    setTimeout(() => {
      this.sending = false;
      this.successMsg = `Commande envoyée en cuisine !`;
      setTimeout(() => {
        this._orderItems.set([]);
        this.successMsg = '';
      }, 2500);
    }, 1000);
  }

  printOrder() {
    if (!this.selectedTable) return;
    const items = this._orderItems();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Commande Table ${this.selectedTable}</title>
      <style>
        body { font-family: monospace; padding: 20px; max-width: 300px; }
        h2 { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; }
        .item { display: flex; justify-content: space-between; padding: 4px 0; }
        .total { border-top: 2px dashed #000; margin-top: 12px; padding-top: 8px; font-weight: bold; display: flex; justify-content: space-between; }
        .note { font-size: 11px; color: #666; font-style: italic; }
      </style></head><body>
      <h2>🍽️ TableOrder</h2>
      <p style="text-align:center">Table ${this.selectedTable} — ${new Date().toLocaleTimeString()}</p>
      ${items.map(i => `
        <div class="item">
          <span>${i.quantity}x ${i.menuItem.name}</span>
          <span>${i.menuItem.price * i.quantity}€</span>
        </div>
        ${i.note ? `<div class="note">↳ ${i.note}</div>` : ''}
      `).join('')}
      <div class="total"><span>TOTAL</span><span>${this.total()}€</span></div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }
}
