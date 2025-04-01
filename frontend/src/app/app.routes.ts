import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ProfileComponent } from './features/profile/profile.component';
import { ProfileEditComponent } from './features/profile/edit-profile/edit-profile.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard],
  },
  {
    path: 'onboarding',
    component: OnboardingComponent,
    canActivate: [authGuard],
  },
  {
    path: 'profile/edit',
    component: ProfileEditComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
