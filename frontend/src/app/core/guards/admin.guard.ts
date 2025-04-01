// frontend/src/app/core/guards/admin.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { map, switchMap } from 'rxjs/operators';
import { AuthRoleService } from '../../services/auth-role.service';
import { Observable, of } from 'rxjs';

export const adminGuard = () => {
  const auth = inject(AuthService);
  const authRoleService = inject(AuthRoleService);
  const router = inject(Router);

  return auth.isAuthenticated$.pipe(
    switchMap((isAuthenticated) => {
      if (!isAuthenticated) {
        router.navigate(['/home']);
        return of(false);
      }

      return authRoleService.isAdmin().pipe(
        map((isAdmin) => {
          if (!isAdmin) {
            router.navigate(['/home']);
            return false;
          }
          return true;
        })
      );
    })
  );
};
