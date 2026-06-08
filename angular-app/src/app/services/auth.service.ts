import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Session } from '../models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly SESSION_KEY = 'zitoun_session';
  session = signal<Session | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadSession();
  }

  private loadSession() {
    const saved = sessionStorage.getItem(this.SESSION_KEY);
    if (saved) {
      const s: Session = JSON.parse(saved);
      if (s.expiresAt > Date.now()) {
        this.session.set(s);
      } else if (s.refreshToken) {
        this.refresh(s.refreshToken).subscribe();
      }
    }
  }

  login(username: string, password: string) {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, { username, password });
  }

  refresh(refreshToken: string) {
    return this.http.post<any>(`${environment.apiUrl}/auth/refresh`, { refreshToken });
  }

  setSession(data: any) {
    const s: Session = {
      user: data.username, role: data.role,
      token: data.accessToken, refreshToken: data.refreshToken,
      expiresAt: Date.now() + data.accessTokenExpiresIn * 1000
    };
    this.session.set(s);
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(s));
  }

  logout() {
    const s = this.session();
    if (s?.refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken: s.refreshToken }).subscribe();
    }
    this.session.set(null);
    sessionStorage.removeItem(this.SESSION_KEY);
    this.router.navigate(['/login']);
  }

  get token(): string { return this.session()?.token ?? ''; }
  get role(): string  { return this.session()?.role  ?? ''; }
  get isLoggedIn(): boolean { return !!this.session(); }

  pagesForRole(): string[] {
    const map: Record<string, string[]> = {
      ADMIN:   ['commandes','cuisine','tables','historique','admin'],
      SERVEUR: ['commandes','tables'],
      CUISINE: ['cuisine'],
      CAISSE:  ['commandes','tables','historique'],
    };
    return map[this.role] ?? [];
  }
}
