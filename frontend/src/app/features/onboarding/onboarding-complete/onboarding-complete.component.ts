import { Component } from '@angular/core';

@Component({
  selector: 'app-onboarding-complete',
  imports: [],
  templateUrl: './onboarding-complete.component.html',
  styleUrl: './onboarding-complete.component.scss',
})
export class OnboardingCompleteComponent {
  message = '✅ Stripe onboarding complete! You may now receive payments.';
}
