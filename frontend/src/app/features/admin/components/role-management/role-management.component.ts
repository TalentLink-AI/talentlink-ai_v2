// src/app/features/admin/role-management/role-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../../services/theme.service';
import { AdminService } from '../../services/admin.service';

interface User {
  _id: string;
  auth0Id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface SyncResult {
  total: number;
  updated: number;
  failed: number;
  details: SyncDetail[];
}

interface SyncDetail {
  userId: string;
  email: string;
  oldRole?: string;
  newRole?: string;
  status: 'updated' | 'failed';
  reason?: string;
}

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.scss'],
})
export class RoleManagementComponent implements OnInit, OnDestroy {
  users: User[] = [];
  roles: Role[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  assignRoleForm: FormGroup;
  isLoading = true;
  isDarkMode = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';

  // For role sync functionality
  isSyncing = false;
  syncResults: SyncResult | null = null;
  showSyncDetails = false;

  // For debug view
  debugRoles: any[] = [];

  private themeSubscription: Subscription | undefined;

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private themeService: ThemeService
  ) {
    this.assignRoleForm = this.fb.group({
      userId: ['', Validators.required],
      roleId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      (isDark) => {
        this.isDarkMode = isDark;
      }
    );

    // Load users and roles
    this.loadUsers();
    this.loadRoles();
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  loadUsers(): void {
    this.adminService.getUsers().subscribe({
      next: (response) => {
        if (response && response.users) {
          this.users = response.users;
          this.filteredUsers = this.users;
          this.prepareDebugView();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.errorMessage = 'Failed to load users. Please try again.';
        this.isLoading = false;
      },
    });
  }

  loadRoles(): void {
    this.adminService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.prepareDebugView();
      },
      error: (err) => {
        console.error('Error loading roles:', err);
        this.errorMessage = 'Failed to load roles. Please try again.';
      },
    });
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.assignRoleForm.patchValue({
      userId: user.auth0Id, // Make sure we're using auth0Id, not MongoDB _id
    });
  }

  filterUsers(): void {
    if (!this.searchQuery.trim()) {
      this.filteredUsers = this.users;
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredUsers = this.users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query)
    );
  }

  assignRole(): void {
    if (this.assignRoleForm.invalid) {
      this.errorMessage = 'Please select both a user and a role.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    const { userId, roleId } = this.assignRoleForm.value;

    // Validate the payload
    if (!userId || !roleId) {
      this.errorMessage = 'Both userId and roleId are required';
      this.isLoading = false;
      return;
    }

    // Get the role name for the success message
    const role = this.roles.find((r) => r.id === roleId);
    const roleName = role ? role.name : 'selected role';

    // Get the user's current role for the success message
    const currentRole = this.selectedUser?.role || 'previous role';

    this.adminService.assignRole(userId, roleId).subscribe({
      next: (response) => {
        this.successMessage = `Role changed from "${currentRole}" to "${roleName}" successfully!`;
        this.isLoading = false;

        // Reset form and selection
        this.selectedUser = null;
        this.assignRoleForm.reset();

        // Reload users to get updated roles
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error assigning role:', err);
        this.errorMessage =
          err.error?.error ||
          'Failed to assign role. Please ensure both user and role are valid.';
        this.isLoading = false;
      },
    });
  }

  // Sync all Auth0 roles with the database
  syncRolesWithDatabase(): void {
    this.isSyncing = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.syncResults = null;
    this.showSyncDetails = false;

    this.adminService.syncAllRoles().subscribe({
      next: (response) => {
        this.isSyncing = false;
        if (response && response.success) {
          this.successMessage =
            response.message || 'Roles synchronized successfully!';
          this.syncResults = response.results;

          // Reload users to reflect changes
          this.loadUsers();
        } else {
          this.errorMessage = 'Role synchronization failed with unknown error';
        }
      },
      error: (err) => {
        console.error('Error syncing roles:', err);
        this.isSyncing = false;
        this.errorMessage =
          err.error?.error || 'Failed to synchronize roles with database';
      },
    });
  }

  // Prepare debug view data by organizing users by role
  prepareDebugView(): void {
    if (!this.roles.length || !this.users.length) return;

    this.debugRoles = this.roles.map((role) => {
      const roleUsers = this.users.filter(
        (user) =>
          user.role && user.role.toLowerCase() === role.name.toLowerCase()
      );

      return {
        ...role,
        users: roleUsers.map((user) => ({
          id: user._id,
          auth0Id: user.auth0Id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          initials: user.firstName.charAt(0) + user.lastName.charAt(0),
        })),
      };
    });
  }

  getUserDisplayName(user: User): string {
    return `${user.firstName} ${user.lastName} (${user.email})`;
  }

  getRoleDisplayName(role: Role): string {
    return role.description ? `${role.name} - ${role.description}` : role.name;
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
