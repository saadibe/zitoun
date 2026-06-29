import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConnectionService {
  online  = signal<boolean>(true);
  latency = signal<number>(0);

  private interval: any;

  constructor(private http: HttpClient) {
    this.startPing();
    window.addEventListener('online',  () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }

  private startPing() {
    this.ping();
    this.interval = setInterval(() => this.ping(), 30_000);
  }

  private ping() {
    const start = Date.now();
    this.http.get(`${environment.apiUrl}/settings`, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.online.set(true);
          this.latency.set(Date.now() - start);
        },
        error: () => this.online.set(false)
      });
  }

  // Retry une requête avec 3 tentatives
  retryUntilSuccess(fn: () => void, maxRetries = 3, delay = 2000) {
    let attempts = 0;
    const try_ = () => {
      if (attempts >= maxRetries) return;
      attempts++;
      try { fn(); } catch {
        setTimeout(try_, delay * attempts);
      }
    };
    try_();
  }
}
