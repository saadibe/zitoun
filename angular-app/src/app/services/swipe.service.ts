import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

const PAGES = ['/commandes', '/cuisine', '/tables', '/historique', '/stats', '/admin'];

@Injectable({ providedIn: 'root' })
export class SwipeService {
  private startX = 0;
  private startY = 0;

  constructor(private router: Router) {}

  init(el: HTMLElement) {
    el.addEventListener('touchstart', (e) => {
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - this.startX;
      const dy = e.changedTouches[0].clientY - this.startY;
      // Swipe horizontal > 80px et plus horizontal que vertical
      if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const current = this.router.url.split('?')[0];
      const idx     = PAGES.findIndex(p => current.startsWith(p));
      if (idx === -1) return;

      if (dx < 0 && idx < PAGES.length - 1) {
        this.router.navigate([PAGES[idx + 1]]);
      } else if (dx > 0 && idx > 0) {
        this.router.navigate([PAGES[idx - 1]]);
      }
    }, { passive: true });
  }
}
