// frontend/src/app/shared/components/header/header.component.ts
import { Component, inject, OnInit } from '@angular/core';
import {
  RouterModule,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { UserService } from '../../services/user.service';
import { filter, switchMap } from 'rxjs/operators';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  auth = inject(AuthService);
  authRoleService = inject(AuthRoleService);
  isAdminUser = false;
  router = inject(Router);
  userService = inject(UserService);
  isMenuOpen = false;

  ngOnInit() {
    this.authRoleService.isAdmin().subscribe((isAdmin) => {
      this.isAdminUser = isAdmin;
    });
    this.auth.isAuthenticated$
      .pipe(
        filter((isAuthenticated) => isAuthenticated),
        switchMap(() => this.userService.getCurrentUser())
      )
      .subscribe();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.auth.logout({
      logoutParams: {
        returnTo: document.location.origin,
      },
    });
  }

  isAdmin(): boolean {
    return this.isAdminUser;
  }
}
