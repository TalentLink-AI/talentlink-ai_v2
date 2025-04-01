// profile.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { UserService, UserProfile } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { switchMap, filter } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
})
export class ProfileComponent implements OnInit {
  userProfile: UserProfile | null = null;
  loading = false;
  error: string | null = null;

  constructor(public auth: AuthService, private userService: UserService) {}

  ngOnInit(): void {
    this.auth.isAuthenticated$
      .pipe(
        filter((isAuthenticated) => isAuthenticated),
        switchMap(() => this.loadUserProfile())
      )
      .subscribe();
  }

  loadUserProfile() {
    this.loading = true;
    this.error = null;
    return this.userService.getCurrentUser().pipe(
      switchMap((profile) => {
        console.log('User profile:', profile);
        this.userProfile = profile;
        this.loading = false;
        return this.auth.user$;
      })
    );
  }

  updateProfile(profileData: Partial<UserProfile['profile']>): void {
    this.loading = true;
    this.userService.updateProfile(profileData).subscribe({
      next: (updatedProfile) => {
        this.userProfile = updatedProfile;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error updating profile:', err);
        this.error = 'Failed to update profile. Please try again.';
        this.loading = false;
      },
    });
  }
}
