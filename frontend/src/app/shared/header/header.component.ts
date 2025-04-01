// frontend/src/app/shared/components/header/header.component.ts
import { Component, inject } from '@angular/core';
import {
  RouterModule,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  auth = inject(AuthService);
  router = inject(Router);
  isMenuOpen = false;

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
}
