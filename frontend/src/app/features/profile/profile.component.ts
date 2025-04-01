// frontend/src/app/features/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';
import { switchMap, filter } from 'rxjs/operators';
import {
  UserService,
  UserData,
  TalentProfile,
  ClientProfile,
} from '../../services/user.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
})
export class ProfileComponent implements OnInit {
  userData: UserData | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    public auth: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.isAuthenticated$
      .pipe(
        filter((isAuthenticated) => isAuthenticated),
        switchMap(() => this.loadUserData())
      )
      .subscribe();
  }

  loadUserData() {
    this.loading = true;
    this.error = null;
    return this.userService.getCurrentUser().pipe(
      switchMap((userData) => {
        this.userData = userData;
        this.loading = false;

        // Check if the user needs to complete onboarding
        if (userData.needsOnboarding) {
          this.router.navigate(['/onboarding']);
        }

        return this.auth.user$;
      })
    );
  }

  // Helper method to check if profile is talent type
  isTalentProfile(): boolean {
    if (!this.userData) return false;
    return this.userData.user.role === 'talent';
  }

  // Helper method to check if profile is client type
  isClientProfile(): boolean {
    if (!this.userData) return false;
    return this.userData.user.role === 'client';
  }

  // Helper to safely access the talent profile
  getTalentProfile(): TalentProfile | null {
    if (!this.userData || !this.userData.profile || !this.isTalentProfile()) {
      return null;
    }
    return this.userData.profile as TalentProfile;
  }

  // Helper to safely access the client profile
  getClientProfile(): ClientProfile | null {
    if (!this.userData || !this.userData.profile || !this.isClientProfile()) {
      return null;
    }
    return this.userData.profile as ClientProfile;
  }

  // Method to edit profile (redirects to an edit form)
  editProfile(): void {
    this.router.navigate(['/profile/edit']);
  }
}
