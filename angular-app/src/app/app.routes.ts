import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  {
    path: '', canActivate: [authGuard],
    loadComponent: () => import('./components/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'commandes', pathMatch: 'full' },
      { path: 'commandes', data: { page: 'commandes' }, canActivate: [roleGuard], loadComponent: () => import('./pages/commandes/commandes.component').then(m => m.CommandesComponent) },
      { path: 'cuisine',   data: { page: 'cuisine'   }, canActivate: [roleGuard], loadComponent: () => import('./pages/cuisine/cuisine.component').then(m => m.CuisineComponent) },
      { path: 'tables',    data: { page: 'tables'    }, canActivate: [roleGuard], loadComponent: () => import('./pages/tables/tables.component').then(m => m.TablesComponent) },
      { path: 'historique',data: { page: 'historique'}, canActivate: [roleGuard], loadComponent: () => import('./pages/historique/historique.component').then(m => m.HistoriqueComponent) },
      { path: 'stats',     data: { page: 'stats'     }, canActivate: [roleGuard], loadComponent: () => import('./pages/stats/stats.component').then(m => m.StatsComponent) },
      { path: 'admin',     data: { page: 'admin'     }, canActivate: [roleGuard], loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent) },
      { path: 'admin/printer', data: { page: 'admin' }, canActivate: [roleGuard], loadComponent: () => import('./pages/admin/printer-config.component').then(m => m.PrinterConfigComponent) },
    ]
  },
  { path: '**', redirectTo: 'login' }
];
