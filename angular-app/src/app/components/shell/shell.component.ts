import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {
  navItems = [
    { path: 'commandes', icon: '📋', label: 'Commandes', page: 'commandes' },
    { path: 'cuisine',   icon: '🍳', label: 'Cuisine',   page: 'cuisine'   },
    { path: 'tables',    icon: '🪑', label: 'Tables',    page: 'tables'    },
    { path: 'historique',icon: '📜', label: 'Historique',page: 'historique'},
    { path: 'admin',     icon: '⚙️', label: 'Admin',     page: 'admin'     },
  ];

  constructor(public auth: AuthService, public settings: SettingsService) {}

  ngOnInit() { this.settings.load(); }

  get visibleNav() {
    const allowed = this.auth.pagesForRole();
    return this.navItems.filter(n => allowed.includes(n.page));
  }

  logout() { this.auth.logout(); }
}
