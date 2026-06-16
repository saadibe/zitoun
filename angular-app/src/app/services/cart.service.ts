import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { CartItem, MenuItem, HistoryEntry, Order } from '../models';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

const HISTORY_KEY = 'laperla_history';
const MAX_HISTORY = 200;

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);

  items   = signal<CartItem[]>([]);
  table   = signal<number | null>(null);
  history = signal<HistoryEntry[]>(this.loadLocalHistory());
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

  constructor() {
    // Persister localement à chaque changement
    effect(() => {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history().slice(0, MAX_HISTORY)));
      } catch {}
    });
  }

  setToken(t: string) { this.token = t; }

  // Charger l'historique depuis la base de données
  loadHistoryFromApi() {
    this.loading.set(true);
    const headers = this.token
      ? new HttpHeaders({ Authorization: `Bearer ${this.token}` })
      : new HttpHeaders();

    this.http.get<Order[]>(`${environment.apiUrl}/orders/history`, { headers })
      .subscribe({
        next: orders => {
          const apiEntries: HistoryEntry[] = orders.map(o => ({
            id:     'F' + o.id,
            table:  o.tableNumber || null,
            date:   o.updatedAt ? o.updatedAt.split(' ')[0] : '',
            time:   o.updatedAt ? o.updatedAt.split(' ')[1] || '' : '',
            method: 'carte',   // inconnu depuis API
            total:  o.total || 0,
            status: 'paid' as const,
            items:  (o.items || []).map(i => ({
              id:    i.id, name: i.name, emoji: i.emoji,
              price: i.price, qty: i.quantity, note: i.note
            }))
          }));
          // Fusionner avec historique local (local = plus récent)
          const localIds = new Set(this.history().map(h => h.id));
          const newFromApi = apiEntries.filter(e => !localIds.has(e.id));
          this.history.update(h => [...h, ...newFromApi]
            .sort((a, b) => b.id.localeCompare(a.id))
            .slice(0, MAX_HISTORY)
          );
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  private loadLocalHistory(): HistoryEntry[] {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
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

  addToHistory(entry: HistoryEntry) {
    this.history.update(h => [entry, ...h].slice(0, MAX_HISTORY));
  }

  updateHistory(id: string, updates: Partial<HistoryEntry>) {
    this.history.update(h => h.map(e => e.id === id ? { ...e, ...updates } : e));
  }

  clearHistory() {
    this.history.set([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }
}
