// frontend/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ProfileComponent } from './features/profile/profile.component';
import { ProfileEditComponent } from './features/profile/edit-profile/edit-profile.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { LayoutComponent } from './shared/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import {
  onboardingGuard,
  onboardingCompletedGuard,
} from './core/guards/onboarding.guard';
import { ADMIN_ROUTES } from './features/admin/admin.routes';
import { PaymentFormComponent } from './features/payment/payment-form/payment-form.component';
import { CheckoutComponent } from './features/payment/checkout/checkout.component';
import { MilestonePaymentComponent } from './features/payment/milestone-payment.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
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
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'profile/edit',
        component: ProfileEditComponent,
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'onboarding',
        component: OnboardingComponent,
        canActivate: [authGuard, onboardingCompletedGuard],
      },
      {
        path: 'payment-form',
        component: PaymentFormComponent,
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'checkout',
        component: CheckoutComponent,
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'milestone-payment',
        component: MilestonePaymentComponent,
        canActivate: [authGuard, onboardingGuard],
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: ADMIN_ROUTES,
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
