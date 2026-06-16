import { Injectable, signal, computed } from '@angular/core';
import { CartItem, MenuItem, HistoryEntry, SelectedOption } from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  items   = signal<CartItem[]>([]);
  table   = signal<number | null>(null);
  history = signal<HistoryEntry[]>([]);

  total = computed(() =>
    this.items().reduce((s, i) => {
      const optExtra = (i.selectedOptions || []).reduce((os, o) => os + o.priceAdjust, 0);
      return s + (i.item.price + optExtra) * i.qty;
    }, 0)
  );
  count = computed(() => this.items().reduce((s, i) => s + i.qty, 0));

  addItem(item: MenuItem, options?: SelectedOption[]) {
    this.items.update(list => {
      // Si composite avec options, toujours ajouter une nouvelle ligne
      if (options && options.length > 0) {
        return [...list, { item, qty: 1, note: '', selectedOptions: options }];
      }
      const found = list.find(i => i.item.id === item.id && !i.selectedOptions?.length);
      if (found) return list.map(i => i.item.id === item.id && !i.selectedOptions?.length
        ? { ...i, qty: i.qty + 1 } : i);
      return [...list, { item, qty: 1, note: '', selectedOptions: [] }];
    });
  }

  removeItem(index: number) {
    this.items.update(list => list.filter((_, i) => i !== index));
  }

  updateQty(index: number, qty: number) {
    if (qty <= 0) { this.removeItem(index); return; }
    this.items.update(list => list.map((item, i) => i === index ? { ...item, qty } : item));
  }

  updateNote(index: number, note: string) {
    this.items.update(list => list.map((item, i) => i === index ? { ...item, note } : item));
  }

  setTable(n: number | null) { this.table.set(n); }
  clear() { this.items.set([]); this.table.set(null); }

  addToHistory(entry: HistoryEntry) {
    this.history.update(h => [entry, ...h]);
  }

  // Mettre à jour une entrée d'historique (ex: encaissement après manger)
  updateHistory(id: string, updates: Partial<HistoryEntry>) {
    this.history.update(h => h.map(e => e.id === id ? { ...e, ...updates } : e));
  }

  // Trouver les entrées en attente d'encaissement pour une table
  pendingForTable(table: number): HistoryEntry[] {
    return this.history().filter(e => e.table === table && e.status === 'pending');
  }
}
