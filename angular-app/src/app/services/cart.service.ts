import { Injectable, signal, computed } from '@angular/core';
import { CartItem, MenuItem } from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  items    = signal<CartItem[]>([]);
  table    = signal<number | null>(null);
  history  = signal<any[]>([]);

  total = computed(() =>
    this.items().reduce((s, i) => s + i.item.price * i.qty, 0)
  );
  count = computed(() =>
    this.items().reduce((s, i) => s + i.qty, 0)
  );

  addItem(item: MenuItem) {
    this.items.update(list => {
      const found = list.find(i => i.item.id === item.id);
      if (found) return list.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...list, { item, qty: 1, note: '' }];
    });
  }

  removeItem(itemId: number) {
    this.items.update(list => list.filter(i => i.item.id !== itemId));
  }

  updateQty(itemId: number, qty: number) {
    if (qty <= 0) { this.removeItem(itemId); return; }
    this.items.update(list => list.map(i => i.item.id === itemId ? { ...i, qty } : i));
  }

  updateNote(itemId: number, note: string) {
    this.items.update(list => list.map(i => i.item.id === itemId ? { ...i, note } : i));
  }

  setTable(n: number | null) { this.table.set(n); }

  clear() { this.items.set([]); this.table.set(null); }

  addToHistory(entry: any) {
    this.history.update(h => [entry, ...h]);
  }
}
