// frontend/src/app/core/services/auth-role.service.ts
import { Injectable, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthRoleService {
  private auth = inject(AuthService);

  constructor() {}

  getUserRoles(): Observable<string[]> {
    return this.auth.user$.pipe(
      map((user) => {
        // Access the custom claim with roles
        return (user && user['https://talentlink.com/roles']) || [];
      })
    );
  }

  isAdmin(): Observable<boolean> {
    return this.getUserRoles().pipe(map((roles) => roles.includes('admin')));
  }

  hasRole(role: string): Observable<boolean> {
    return this.getUserRoles().pipe(map((roles) => roles.includes(role)));
  }
}
