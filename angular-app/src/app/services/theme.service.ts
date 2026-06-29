import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  dark = signal<boolean>(
    sessionStorage.getItem('theme') === 'dark'
  );

  constructor() { this.apply(); }

  toggle() {
    this.dark.set(!this.dark());
    sessionStorage.setItem('theme', this.dark() ? 'dark' : 'light');
    this.apply();
  }

  private apply() {
    document.documentElement.setAttribute(
      'data-theme', this.dark() ? 'dark' : 'light'
    );
  }
}
