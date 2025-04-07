// src/app/shared/role-switcher/role-switcher.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-role-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="role-switcher">
      <button
        (click)="switchRole()"
        class="btn"
        [ngClass]="userRole === 'client' ? 'btn-primary' : 'btn-success'"
      >
        <span class="role-icon">{{ userRole === 'client' ? '👔' : '👷' }}</span>
        <span class="role-label">{{ userRole | titlecase }}</span>
        <span class="switch-icon">⇄</span>
        <span class="target-role">{{
          userRole === 'client' ? 'Talent' : 'Client'
        }}</span>
      </button>
    </div>
  `,
  styles: [
    `
      .role-switcher {
        margin: 0 1rem;
      }
      .role-icon {
        margin-right: 0.5rem;
      }
      .role-label {
        font-weight: bold;
      }
      .switch-icon {
        margin: 0 0.5rem;
        font-size: 0.8rem;
      }
      .btn-primary {
        background-color: #4f83f1;
      }
      .btn-success {
        background-color: #34c759;
      }
    `,
  ],
})
export class RoleSwitcherComponent implements OnInit {
  userRole: string = 'client';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    // Get initial role
    this.userRole = this.userService.getUserRole();

    // Subscribe to role changes
    this.userService.userRole$.subscribe((role) => {
      this.userRole = role;
    });
  }

  switchRole(): void {
    this.userRole = this.userService.toggleUserRole();
  }
}
