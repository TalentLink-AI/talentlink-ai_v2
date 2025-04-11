// frontend/src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AdminMilestonesComponent } from './pages/admin-milestones/admin-milestones.component';
import { RoleManagementComponent } from './components/role-management/role-management.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
      },
      {
        path: 'milestones',
        component: AdminMilestonesComponent,
      },
      {
        path: 'roles',
        component: RoleManagementComponent,
      },
    ],
  },
];
