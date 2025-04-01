// frontend/src/app/core/guards/onboarding.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { map, switchMap } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { of } from 'rxjs';

export const onboardingGuard = () => {
  const auth = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  return auth.isAuthenticated$.pipe(
    switchMap((isAuthenticated) => {
      if (!isAuthenticated) {
        router.navigate(['/home']);
        return of(false);
      }

      return userService.getCurrentUser().pipe(
        map((profile) => {
          // If user needs onboarding, redirect to onboarding
          if (profile.needsOnboarding) {
            router.navigate(['/onboarding']);
            return false;
          }
          return true;
        })
      );
    })
  );
};

// This guard is for making sure users who have completed onboarding
// don't go back to the onboarding flow
export const onboardingCompletedGuard = () => {
  const auth = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  return auth.isAuthenticated$.pipe(
    switchMap((isAuthenticated) => {
      if (!isAuthenticated) {
        router.navigate(['/home']);
        return of(false);
      }

      return userService.getCurrentUser().pipe(
        map((profile) => {
          // If user doesn't need onboarding, redirect to profile
          if (!profile.needsOnboarding) {
            router.navigate(['/profile']);
            return false;
          }
          return true;
        })
      );
    })
  );
};
