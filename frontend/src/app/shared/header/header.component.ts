// frontend/src/app/shared/header/header.component.ts
import { Component, OnInit, HostListener, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { UserService } from '../../services/user.service';
import { ThemeService } from '../../services/theme.service';
import { AuthRoleService } from '../../services/auth-role.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  auth = inject(AuthService);
  userService = inject(UserService);
  authRoleService = inject(AuthRoleService);
  isAdminUser = false;
  themeService = inject(ThemeService);

  isMobileMenuOpen = false;
  isMobileSearchOpen = false;
  isUserMenuOpen = false;
  notificationCount = 0;
  isDarkMode = false;

  // For mobile submenu states
  mobileSubmenus = {
    findTalent: false,
    postJob: false,
  };

  constructor() {}

  ngOnInit(): void {
    this.authRoleService.isAdmin().subscribe((isAdmin) => {
      this.isAdminUser = isAdmin;
    });
    // Get notification count - just a placeholder
    this.getNotificationCount();

    // Check current theme
    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    // Close user menu when mobile menu is toggled
    if (this.isMobileMenuOpen) {
      this.isUserMenuOpen = false;
    }

    // When opening mobile menu, reset submenu states
    if (this.isMobileMenuOpen) {
      this.mobileSubmenus = {
        findTalent: false,
        postJob: false,
      };
    }

    // Prevent scrolling when mobile menu is open
    document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
  }
  toggleMobileSearch(): void {
    this.isMobileSearchOpen = !this.isMobileSearchOpen;

    // Close mobile menu when search is opened
    if (this.isMobileSearchOpen) {
      this.isMobileMenuOpen = false;
      document.body.style.overflow = '';
    }

    // Focus on search input when opened
    if (this.isMobileSearchOpen) {
      setTimeout(() => {
        const searchInput = document.querySelector(
          '.mobile-search-input'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 300);
    }
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  toggleMobileSubmenu(submenu: string): void {
    this.mobileSubmenus[submenu as keyof typeof this.mobileSubmenus] =
      !this.mobileSubmenus[submenu as keyof typeof this.mobileSubmenus];
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.themeService.setTheme(theme);
  }

  logout(): void {
    this.auth.logout({
      logoutParams: {
        returnTo: document.location.origin,
      },
    });
  }

  getInitials(name: string | undefined): string {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getUserRole(): string {
    const role = this.userService.getUserRole();
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Talent';
  }

  isAdmin(): boolean {
    return this.isAdminUser;
  }

  getNotificationCount(): void {
    // Placeholder - this would be fetched from a service
    this.notificationCount = 3;
  }

  // Close menus when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Close user menu if clicking outside
    const userMenuElement = document.querySelector('.user-menu');
    if (userMenuElement && !userMenuElement.contains(target)) {
      this.isUserMenuOpen = false;
    }
  }

  // Handle escape key to close mobile menus and search
  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      document.body.style.overflow = '';
    }

    if (this.isMobileSearchOpen) {
      this.isMobileSearchOpen = false;
    }

    if (this.isUserMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }
}
