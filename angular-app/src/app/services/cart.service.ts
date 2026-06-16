import { Injectable, signal, computed } from '@angular/core';
import { CartItem, MenuItem, HistoryEntry } from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  items   = signal<CartItem[]>([]);
  table   = signal<number | null>(null);
  history = signal<HistoryEntry[]>([]);

  // menuPrice injecté depuis SettingsService
  menuPrice = 2.0;

  total = computed(() =>
    this.items().reduce((s, i) => {
      const extra = i.withMenu ? this.menuPrice : 0;
      return s + (i.item.price + extra) * i.qty;
    }, 0)
  );
  count = computed(() => this.items().reduce((s, i) => s + i.qty, 0));

  addItem(item: MenuItem, piment?: string, withMenu?: boolean) {
    this.items.update(list => {
      // Même article + mêmes options → incrémenter
      const found = list.find(i =>
        i.item.id === item.id &&
        i.piment === (piment || 'normal') &&
        !!i.withMenu === !!withMenu
      );
      if (found) return list.map(i =>
        i.item.id === item.id && i.piment === (piment||'normal') && !!i.withMenu === !!withMenu
          ? { ...i, qty: i.qty + 1 } : i
      );
      return [...list, { item, qty: 1, note: '', piment: piment || 'normal', withMenu: !!withMenu }];
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

  addToHistory(entry: HistoryEntry) { this.history.update(h => [entry, ...h]); }
  updateHistory(id: string, updates: Partial<HistoryEntry>) {
    this.history.update(h => h.map(e => e.id === id ? { ...e, ...updates } : e));
  }
}
