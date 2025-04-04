// payment-form.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { PaymentService } from '../../../services/payment.service';
import { StripeService } from '../../../services/stripe.service';

@Component({
  selector: 'app-payment-form',
  templateUrl: './payment-form.component.html',
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ['./payment-form.component.scss'],
})
export class PaymentFormComponent implements OnInit, OnDestroy {
  paymentForm: FormGroup;
  isLoading = false;
  paymentError = '';
  paymentSuccess = false;
  clientSecret = '';

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private stripeService: StripeService
  ) {
    this.paymentForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      amount: [1000, [Validators.required, Validators.min(100)]],
    });
  }

  ngOnInit(): void {
    // Create a PaymentIntent when the component initializes
    this.createPaymentIntent();
  }

  ngOnDestroy(): void {
    this.stripeService.destroyCardElement();
  }

  async createPaymentIntent(): Promise<void> {
    this.isLoading = true;

    try {
      const amount = this.paymentForm.get('amount')?.value || 1000;

      const response = await this.paymentService
        .createPaymentIntent(amount)
        .toPromise();
      this.clientSecret = response.data.client_secret;

      // Initialize card element
      await this.stripeService.createCardElement(
        this.clientSecret,
        'card-element'
      );

      this.isLoading = false;
    } catch (error) {
      this.paymentError = 'Failed to initialize payment. Please try again.';
      this.isLoading = false;
      console.error(error);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.paymentForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.paymentError = '';

    try {
      const result = await this.stripeService.confirmCardPayment(
        this.clientSecret
      );

      if (result.error) {
        this.paymentError = result.error.message;
      } else if (result.paymentIntent.status === 'succeeded') {
        this.paymentSuccess = true;
        // Handle successful payment (e.g., redirect to confirmation page)
      }
    } catch (error: any) {
      this.paymentError = error.message || 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }
}
