import { Injectable, signal, effect } from '@angular/core';
import { RestaurantSettings, Category } from '../models';
import { ApiService } from './api.service';
import { CartService } from './cart.service';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  settings = signal<RestaurantSettings>({
    id: 1, name: 'La Perla', subtitle: 'Saveurs Authentiques de Tunisie',
    city: 'Tunisie', icon: '🌶️', taxNumber: '', currency: 'DT',
    tvaRate: 10, theme: 'vert', menuPrice: 2.0,
    address: '', phone: '', email: '', tvaNumber: '', nafCode: '',
    legalName: '', ticketFooter: 'Merci de votre visite'
  });
  categories = signal<Category[]>([]);
  loaded = signal(false);

  constructor(private api: ApiService, private cart: CartService) {
    effect(() => {
      const s = this.settings();
      this.applyTheme(s.theme);
      // Sync menuPrice dans CartService
      this.cart.menuPrice = s.menuPrice || 2.0;
    });
  }

  load() {
    this.api.getSettings().subscribe({
      next: s => { if (s) { this.settings.set(s); this.loaded.set(true); } },
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
    if (theme && theme !== 'vert') body.classList.add(`theme-${theme}`);
  }

  fmt(amount: number): string {
    const s = this.settings();
    const dec = s.currency === 'DT' ? 3 : 2;
    return `${amount.toFixed(dec)} ${s.currency}`;
  }

  get tvaCoef(): number { return this.settings().tvaRate / 100; }

  // Catégories qui activent le piment
  readonly pimentCategories = ['SANDWICH', 'SANDWICHS', 'SANDWISCH', 'PLAT', 'TABOUNA', 'CHAPATI'];

  isSandwich(category: string): boolean {
    return this.pimentCategories.some(c => category.toUpperCase().includes(c));
  }
}
