// checkout.component.ts - without CartService
import { Component, OnInit } from '@angular/core';
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
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
  checkoutForm: FormGroup;
  clientSecret: string = '';
  isLoading = false;
  isCardComplete = false;
  paymentError = '';
  paymentSuccess = false;

  // Hardcoded order amount for testing - replace with your actual logic
  amount = 1000; // $10.00 in cents

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private stripeService: StripeService
  ) {
    this.checkoutForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zip: ['', [Validators.required, Validators.pattern('[0-9]{5}')]],
    });
  }

  ngOnInit(): Promise<void> {
    return this.initializePayment();
  }

  async initializePayment(): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.paymentService
        .createPaymentIntent(this.amount)
        .toPromise();
      this.clientSecret = response.data.client_secret;
      this.isLoading = false;
    } catch (error) {
      this.paymentError = 'Could not initialize payment. Please try again.';
      this.isLoading = false;
    }
  }

  onCardReady(isComplete: boolean): void {
    this.isCardComplete = isComplete;
  }

  async onSubmit(): Promise<void> {
    if (this.checkoutForm.invalid || !this.isCardComplete) {
      return;
    }

    this.isLoading = true;
    this.paymentError = '';

    try {
      // Confirm card payment
      const result = await this.stripeService.confirmCardPayment(
        this.clientSecret
      );

      if (result.error) {
        this.paymentError = result.error.message;
      } else if (result.paymentIntent.status === 'succeeded') {
        this.paymentSuccess = true;

        // Handle successful payment (e.g., redirect to success page)
        // You can add a redirect here when ready
        // this.router.navigate(['/payment-success']);
      }
    } catch (error: any) {
      this.paymentError =
        error.message || 'Payment processing failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
