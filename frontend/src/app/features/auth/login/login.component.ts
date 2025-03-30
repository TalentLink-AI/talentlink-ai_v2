import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <h1>Welcome to TalentLink</h1>
      <p>Connect with top talent or find your next opportunity</p>
      <ng-container *ngIf="auth.isAuthenticated$ | async; else loggedOut">
        <button
          (click)="
            auth.logout({
              logoutParams: { returnTo: document.location.origin }
            })
          "
        >
          Log out
        </button>
      </ng-container>

      <ng-template #loggedOut>
        <button (click)="auth.loginWithRedirect()">Log in</button>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .login-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        text-align: center;
      }

      .login-button {
        margin-top: 20px;
        padding: 10px 20px;
        background-color: #0056b3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
      }

      .login-button:hover {
        background-color: #003d82;
      }
    `,
  ],
})
export class LoginComponent {
  constructor(
    @Inject(DOCUMENT) public document: Document,
    public auth: AuthService
  ) {}
}
