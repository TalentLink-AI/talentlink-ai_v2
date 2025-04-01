// frontend/src/app/features/admin/components/admin-sidebar/admin-sidebar.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss'],
})
export class AdminSidebarComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Users', route: '/admin/users', icon: 'people' },
    { label: 'Jobs', route: '/admin/jobs', icon: 'work' },
    { label: 'Payments', route: '/admin/payments', icon: 'payments' },
    { label: 'Reports', route: '/admin/reports', icon: 'analytics' },
    { label: 'Settings', route: '/admin/settings', icon: 'settings' },
  ];
}
