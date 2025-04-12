// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './features/pages/home/home.component';
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
import { OnboardingCompleteComponent } from './features/onboarding/onboarding-complete/onboarding-complete.component';
import { OnboardingRefreshComponent } from './features/onboarding/onboarding-refresh/onboarding-refresh.component';

// Job Feature Components
import { JobListingComponent } from './features/jobs/job-listing/job-listing.component';
import { JobDetailComponent } from './features/jobs/job-detail/job-detail.component';
import { ComprehensiveJobPostComponent } from './features/jobs/job-post/job-post.component';
import { UserDashboardComponent } from './features/user/dashboard/dashboard.component';

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
        path: 'dashboard',
        component: UserDashboardComponent,
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
        path: 'job-listing',
        component: JobListingComponent,
        canActivate: [authGuard, onboardingGuard],
      },
      {
        path: 'jobs/comprehensive-post',
        component: ComprehensiveJobPostComponent,
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
