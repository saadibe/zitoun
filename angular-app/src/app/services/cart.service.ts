import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { CartItem, MenuItem, HistoryEntry, Order } from '../models';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);

  items   = signal<CartItem[]>([]);
  table   = signal<number | null>(null);
  history = signal<HistoryEntry[]>([]);
  loading = signal(false);

  menuPrice = 2.0;
  private token = '';

  total = computed(() =>
    this.items().reduce((s, i) => {
      const extra = i.withMenu ? this.menuPrice : 0;
      return s + (i.item.price + extra) * i.qty;
    }, 0)
  );
  count = computed(() => this.items().reduce((s, i) => s + i.qty, 0));

  setToken(t: string) { this.token = t; }

  // Charger l'historique depuis la base de données
  loadHistoryFromApi() {
    if (!this.token) return;
    this.loading.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.token}` });

    this.http.get<Order[]>(`${environment.apiUrl}/orders/history`, { headers })
      .subscribe({
        next: orders => {
          const entries: HistoryEntry[] = orders.map(o => ({
            id:     'F' + o.id,
            table:  o.tableNumber || null,
            date:   (o.paidAt || o.updatedAt || o.createdAt || '').split(' ')[0] || '',
            time:   (o.paidAt || o.updatedAt || o.createdAt || '').split(' ')[1] || '',
            method: o.paymentMethod || null,
            total:  o.total || 0,
            status: 'paid' as const,
            items:  (o.items || []).map(i => ({
              id: i.id, name: i.name, emoji: i.emoji,
              price: i.price, qty: i.quantity, note: i.note || ''
            }))
          }));
          // Fusionner avec les entrées pending (non encore en base)
          const pending = this.history().filter(h => h.status === 'pending');
          this.history.set([...pending, ...entries]);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  addItem(item: MenuItem, piment?: string, withMenu?: boolean) {
    this.items.update(list => {
      const found = list.find(i =>
        i.item.id === item.id &&
        i.piment === (piment || 'normal') &&
        !!i.withMenu === !!withMenu
      );
      if (found) return list.map(i =>
        i.item.id === item.id && i.piment === (piment||'normal') && !!i.withMenu === !!withMenu
          ? { ...i, qty: i.qty + 1 } : i
      );
      return [...list, { item, qty: 1, note: '', piment: piment||'normal', withMenu: !!withMenu }];
    });
  }

  removeItem(index: number) {
    this.items.update(list => list.filter((_, i) => i !== index));
  }

  updateQty(index: number, qty: number) {
    if (qty <= 0) { this.removeItem(index); return; }
    this.items.update(list => list.map((item, i) => i === index ? { ...item, qty } : item));
  }

  setTable(n: number | null) { this.table.set(n); }
  clear() { this.items.set([]); this.table.set(null); }

  // Ajouter une entrée pending (payer après manger - pas encore en base)
  addToHistory(entry: HistoryEntry) {
    this.history.update(h => [entry, ...h]);
  }

  // Mettre à jour une entrée (ex: encaissement d'un pending)
  updateHistory(id: string, updates: Partial<HistoryEntry>) {
    this.history.update(h => h.map(e => e.id === id ? { ...e, ...updates } : e));
  }

  clearHistory() {
    this.history.set([]);
  }
}
