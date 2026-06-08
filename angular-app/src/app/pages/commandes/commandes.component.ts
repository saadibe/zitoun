import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { MenuItem, Category } from '../../models';

@Component({
  selector: 'app-commandes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commandes.component.html',
  styleUrl: './commandes.component.scss'
})
export class CommandesComponent implements OnInit {
  menu     = signal<MenuItem[]>([]);
  tables   = signal<number[]>([0,1,2,3,4,5,6,7,8,9,10]);
  activeCat = signal<string>('all');
  sending  = signal(false);
  sent     = signal(false);

  filtered = computed(() => {
    const cat = this.activeCat();
    return cat === 'all'
      ? this.menu().filter(m => m.available)
      : this.menu().filter(m => m.available && m.category.toLowerCase() === cat.toLowerCase());
  });

  get categories(): Category[] {
    return this.settings.categories();
  }

  constructor(
    public cart: CartService,
    public settings: SettingsService,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.api.getMenu().subscribe(m => this.menu.set(m));
  }

  selectTable(n: number) { this.cart.setTable(n); }
  selectCat(k: string)   { this.activeCat.set(k); }
  addItem(item: MenuItem){ this.cart.addItem(item); }

  get tableLabel(): string {
    const t = this.cart.table();
    return t === 0 ? '🥡 À emporter' : t !== null ? `Table ${t}` : 'Aucune table';
  }

  canSend(): boolean {
    return this.cart.table() !== null && this.cart.count() > 0;
  }

  send() {
    if (!this.canSend()) return;
    // Ouvrir encaissement - emit event or use service
    // TODO: ouvrir modal encaissement
  }
}
