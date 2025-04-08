// src/app/app.routes.ts
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
import { MilestonePaymentComponent } from './features/jobs/milestone-payment/milestone-payment.component';
import { MilestoneDetailComponent } from './features/jobs/milestone-detail/milestone-detail.component';
import { EscrowPaymentComponent } from './features/jobs/escrow-payment/escrow-payment.component';
import { PaymentStatusComponent } from './features/jobs/payment-status/payment-status.component';
import { OnboardingCompleteComponent } from './features/onboarding/onboarding-complete/onboarding-complete.component';
import { OnboardingRefreshComponent } from './features/onboarding/onboarding-refresh/onboarding-refresh.component';

// Job Feature Components
import { JobListComponent } from './features/jobs/job-list/job-list.component';
import { JobPostComponent } from './features/jobs/job-post/job-post.component';
import { JobDetailComponent } from './features/jobs/job-detail/job-detail.component';

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
        path: 'stripe/onboarding/complete',
        component: OnboardingCompleteComponent,
      },
      {
        path: 'stripe/onboarding/refresh',
        component: OnboardingRefreshComponent,
      },
      // Job routes
      {
        path: 'jobs',
        component: JobListComponent,
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'jobs/manage',
        component: JobListComponent,
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'jobs/post',
        component: JobPostComponent,
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'jobs/:id',
        component: JobDetailComponent,
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'jobs/:jobId/milestones/:milestoneId',
        component: MilestoneDetailComponent,
        canActivate: [authGuard],
      },
      // Payment routes
      {
        path: 'milestone-payment',
        component: MilestonePaymentComponent,
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'escrow-payment',
        component: EscrowPaymentComponent,
      },
      {
        path: 'payment-status',
        component: PaymentStatusComponent,
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
