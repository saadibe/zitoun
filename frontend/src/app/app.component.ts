import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-shell">
      <nav class="sidebar">
        <div class="brand">
          <span class="brand-icon">🍽️</span>
          <span class="brand-name">TableOrder</span>
        </div>
        <ul class="nav-links">
          <li>
            <a routerLink="/server" routerLinkActive="active">
              <span class="icon">📋</span>
              <span>Commandes</span>
            </a>
          </li>
          <li>
            <a routerLink="/kitchen" routerLinkActive="active">
              <span class="icon">👨‍🍳</span>
              <span>Cuisine</span>
            </a>
          </li>
          <li>
            <a routerLink="/tables" routerLinkActive="active">
              <span class="icon">🪑</span>
              <span>Tables</span>
            </a>
          </li>
        </ul>
        <div class="sidebar-footer">
          <span class="status-dot"></span>
          <span>Connecté</span>
        </div>
      </nav>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .app-shell {
      display: flex;
      height: 100vh;
      background: #0f0f0f;
      font-family: 'DM Sans', sans-serif;
    }
    .sidebar {
      width: 220px;
      background: #1a1a1a;
      border-right: 1px solid #2a2a2a;
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      gap: 8px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 8px 24px;
      border-bottom: 1px solid #2a2a2a;
      margin-bottom: 16px;
    }
    .brand-icon { font-size: 24px; }
    .brand-name {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
    }
    .nav-links {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-links a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 10px;
      color: #888;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .nav-links a:hover { background: #252525; color: #ccc; }
    .nav-links a.active { background: #f59e0b; color: #000; }
    .icon { font-size: 18px; }
    .sidebar-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      color: #555;
      font-size: 12px;
    }
    .status-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .main-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class AppComponent {}
