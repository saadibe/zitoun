import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'server', pathMatch: 'full' },
  {
    path: 'server',
    loadComponent: () => import('./components/server/server-order.component').then(m => m.ServerOrderComponent)
  },
  {
    path: 'kitchen',
    loadComponent: () => import('./components/kitchen/kitchen.component').then(m => m.KitchenComponent)
  },
  { path: '**', redirectTo: 'server' }
];
