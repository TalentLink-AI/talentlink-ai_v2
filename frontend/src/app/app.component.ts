// frontend/src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { UserService } from './services/user.service';
import { filter, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {
  title = 'TalentLink';

  constructor(public auth: AuthService, private userService: UserService) {}

  ngOnInit(): void {
    // When a user logs in, check if they need to complete onboarding
    this.auth.isAuthenticated$
      .pipe(
        filter((isAuthenticated) => isAuthenticated),
        switchMap(() => this.userService.getCurrentUser()),
        tap((userProfile) => {
          if (userProfile.needsOnboarding) {
            // The router guard will handle redirection to onboarding
          }
        })
      )
      .subscribe();
  }
}
