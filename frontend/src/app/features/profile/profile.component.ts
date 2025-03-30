import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="profile-container">
      <header>
        <h1>Your Profile</h1>
        <div class="nav-links">
          <a routerLink="/dashboard">Back to Dashboard</a>
        </div>
      </header>

      <main>
        <div class="profile-content">
          <div class="profile-info">
            <div class="profile-picture">
              <img
                [src]="user?.picture || 'assets/default-profile.png'"
                alt="Profile Picture"
              />
            </div>

            <div class="user-details">
              <h2>{{ user?.name || 'User' }}</h2>
              <p>{{ user?.email }}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .profile-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 0 20px;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 0;
        border-bottom: 1px solid #e0e0e0;
      }

      .nav-links a {
        text-decoration: none;
        color: #0056b3;
      }

      .profile-content {
        padding: 40px 0;
      }

      .profile-info {
        display: flex;
        align-items: center;
        margin-bottom: 30px;
      }

      .profile-picture {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 20px;
      }

      .profile-picture img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .user-details {
        flex: 1;
      }

      .profile-form {
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
      }

      .form-control {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
      }

      .form-actions {
        margin-top: 30px;
      }

      .update-button {
        padding: 10px 20px;
        background-color: #0056b3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
      }

      .update-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  user: any = null;
  profileForm: FormGroup;

  constructor(private auth: AuthService, private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.auth.user$.subscribe((user) => {
      this.user = user;
      // Set initial form values from user data
      this.profileForm.patchValue({
        firstName: user?.given_name || '',
        lastName: user?.family_name || '',
      });
    });
  }
}
