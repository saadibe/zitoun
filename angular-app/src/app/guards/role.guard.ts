import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const page = route.data['page'] as string;
  if (auth.pagesForRole().includes(page)) return true;
  router.navigate(['/commandes']);
  return false;
};
