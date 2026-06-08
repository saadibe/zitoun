import { Injectable, signal } from '@angular/core';
import { RestaurantSettings, Category } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  settings = signal<RestaurantSettings>({
    id: 1, name: 'La Perla', subtitle: 'Saveurs Authentiques de Tunisie',
    city: 'Tunisie', icon: '🌶️', taxNumber: '', currency: 'DT', tvaRate: 10, theme: 'vert'
  });
  categories = signal<Category[]>([]);

  constructor(private api: ApiService) {}

  load() {
    this.api.getSettings().subscribe(s => this.settings.set(s));
    this.api.getCategories().subscribe(cats => this.categories.set(cats));
  }

  fmt(amount: number): string {
    const s = this.settings();
    const dec = s.currency === 'DT' ? 3 : 2;
    return `${amount.toFixed(dec)} ${s.currency}`;
  }

  get tvaCoef(): number { return this.settings().tvaRate / 100; }
}
