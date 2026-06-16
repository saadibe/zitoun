import { Injectable, signal, effect } from '@angular/core';
import { RestaurantSettings, Category } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  settings = signal<RestaurantSettings>({
    id: 1, name: 'La Perla', subtitle: 'Saveurs Authentiques de Tunisie',
    city: 'Tunisie', icon: '🌶️', taxNumber: '', currency: 'DT', tvaRate: 10, theme: 'vert'
  });
  categories = signal<Category[]>([]);
  loaded = signal(false);

  constructor(private api: ApiService) {
    // Appliquer le thème dès que settings changent
    effect(() => {
      const s = this.settings();
      this.applyTheme(s.theme);
    });
  }

  load() {
    this.api.getSettings().subscribe({
      next: s => {
        if (s) {
          this.settings.set(s);
          this.loaded.set(true);
        }
      },
      error: () => this.loaded.set(true)
    });
    this.api.getCategories().subscribe({
      next: cats => { if (cats?.length) this.categories.set(cats); },
      error: () => {}
    });
  }

  private applyTheme(theme: string) {
    const body = document.body;
    body.classList.remove('theme-vert','theme-bleu','theme-blanc','theme-noir');
    if (theme && theme !== 'vert') {
      body.classList.add(`theme-${theme}`);
    }
  }

  fmt(amount: number): string {
    const s = this.settings();
    const dec = s.currency === 'DT' ? 3 : 2;
    return `${amount.toFixed(dec)} ${s.currency}`;
  }

  get tvaCoef(): number { return this.settings().tvaRate / 100; }
}
