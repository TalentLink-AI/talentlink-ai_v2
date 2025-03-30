import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <header>
        <h1>TalentLink Dashboard</h1>
        <div class="user-controls">
          <span>Welcome, {{ user?.name || 'User' }}</span>
          <button
            (click)="
              auth.logout({
                logoutParams: { returnTo: document.location.origin }
              })
            "
          >
            Log out
          </button>
        </div>
      </header>

      <main>
        <div class="dashboard-content">
          <h2>Your Dashboard</h2>
          <p>This is a protected page that only authenticated users can see.</p>

          <div class="quick-links">
            <a routerLink="/profile" class="dashboard-card">
              <h3>My Profile</h3>
              <p>View and update your profile information</p>
            </a>

            <!-- More dashboard cards would go here -->
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        max-width: 1200px;
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

      .user-controls {
        display: flex;
        align-items: center;
      }

      .user-controls span {
        margin-right: 20px;
      }

      .logout-button {
        padding: 8px 16px;
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }

      .dashboard-content {
        padding: 40px 0;
      }

      .quick-links {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 30px;
      }

      .dashboard-card {
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 8px;
        text-decoration: none;
        color: inherit;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .dashboard-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  user: any = null;

  constructor(
    @Inject(DOCUMENT) public document: Document,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.auth.user$.subscribe((user) => {
      this.user = user;
    });
  }
}
