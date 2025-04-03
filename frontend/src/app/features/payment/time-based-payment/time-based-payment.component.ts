// frontend/src/app/features/payments/time-based-payment/time-based-payment.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  PaymentService,
  PaymentMethod,
} from '../../../services/payment.service';
import { LoggerService } from '../../../core/services/logger.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '@auth0/auth0-angular';
import { switchMap, filter } from 'rxjs/operators';

@Component({
  selector: 'app-time-based-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './time-based-payment.component.html',
  styleUrls: ['./time-based-payment.component.scss'],
})
export class TimeBasedPaymentComponent implements OnInit {
  @Input() contractId!: string;
  @Input() hourlyRate?: number;
  @Input() weeklyRate?: number;
  @Input() paymentModel: 'hourly' | 'weekly' = 'hourly';

  paymentForm!: FormGroup;
  paymentMethods: PaymentMethod[] = [];
  loading = false;
  paymentInProgress = false;
  showPaymentForm = false;
  error: string | null = null;
  success: string | null = null;
  isClient = false;
  isTalent = false;

  // Time logs for the contract - this would typically come from a timesheet service
  timeLogs: any[] = [];

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private userService: UserService,
    private auth: AuthService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    // Check user role
    this.auth.user$
      .pipe(
        filter((user) => !!user),
        switchMap(() => this.userService.getCurrentUser())
      )
      .subscribe({
        next: (userData) => {
          this.isClient = userData.user.role === 'client';
          this.isTalent = userData.user.role === 'talent';

          // Initialize form
          this.initForm();

          // Load payment methods if user is a client
          if (this.isClient) {
            this.loadPaymentMethods();
          }

          // Load time logs (mock data for now)
          this.loadTimeLogs();
        },
        error: (error) => {
          this.logger.error('Error determining user role:', error);
          this.error = 'Failed to load user information';
        },
      });
  }

  initForm(): void {
    this.paymentForm = this.fb.group({
      hours: [null, [Validators.required, Validators.min(0.5)]],
      paymentMethodId: ['', Validators.required],
      note: [''],
    });
  }

  loadPaymentMethods(): void {
    this.loading = true;
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.loading = false;

        // If we have at least one payment method, select it by default
        if (this.paymentMethods.length > 0) {
          this.paymentForm.patchValue({
            paymentMethodId: this.paymentMethods[0].id,
          });
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Failed to load payment methods';
        this.logger.error('Error loading payment methods', error);
      },
    });
  }

  loadTimeLogs(): void {
    // This would normally call a service to get time logs for this contract
    // For now, we'll use mock data
    this.timeLogs = [
      {
        id: '1',
        date: new Date(2025, 3, 1),
        hours: 5,
        description: 'Initial project setup',
        status: 'approved',
        paidDate: new Date(2025, 3, 3),
      },
      {
        id: '2',
        date: new Date(2025, 3, 2),
        hours: 7,
        description: 'Frontend implementation',
        status: 'approved',
        paidDate: new Date(2025, 3, 5),
      },
      {
        id: '3',
        date: new Date(2025, 3, 3),
        hours: 6,
        description: 'API integration',
        status: 'pending',
      },
    ];
  }

  togglePaymentForm(): void {
    this.showPaymentForm = !this.showPaymentForm;
    this.error = null;
    this.success = null;
  }

  makePayment(): void {
    if (this.paymentForm.invalid) {
      this.error = 'Please fill in all required fields';
      return;
    }

    const { hours, paymentMethodId, note } = this.paymentForm.value;

    this.paymentInProgress = true;
    this.error = null;
    this.success = null;

    this.paymentService
      .createTimeBasedPayment(this.contractId, paymentMethodId, hours)
      .subscribe({
        next: (paymentIntent) => {
          this.paymentInProgress = false;

          if (paymentIntent.status === 'succeeded') {
            // Payment succeeded immediately
            this.success = 'Payment processed successfully!';
            this.showPaymentForm = false;

            // Add the payment to our time logs (this would normally be handled by the backend)
            this.timeLogs.unshift({
              id: Date.now().toString(),
              date: new Date(),
              hours,
              description: note || 'Payment for hours worked',
              status: 'approved',
              paidDate: new Date(),
            });
          } else if (paymentIntent.status === 'processing') {
            // Payment is being processed
            this.success =
              'Payment is processing. This may take a few moments.';
          } else if (paymentIntent.clientSecret) {
            // Handle any additional actions required (3D Secure, etc.)
            this.handleAdditionalPaymentActions(paymentIntent.clientSecret);
          }

          // Clear form
          this.paymentForm.reset();

          // Clear success message after 5 seconds
          setTimeout(() => {
            this.success = null;
          }, 5000);
        },
        error: (error) => {
          this.paymentInProgress = false;
          this.error = error.message || 'Failed to process payment';
          this.logger.error('Error processing payment', error);
        },
      });
  }

  handleAdditionalPaymentActions(clientSecret: string): void {
    // This would need to use Stripe.js to handle authentication
    // For now, just show a message that additional verification might be needed
    this.success =
      'Your payment may require additional verification. Please check your email or banking app.';
  }

  // Helper methods for presentation
  getApprovedHours(): number {
    return this.timeLogs
      .filter((log) => log.status === 'pending')
      .reduce((total, log) => total + log.hours, 0);
  }

  getTotalPaidHours(): number {
    return this.timeLogs
      .filter((log) => log.status === 'approved')
      .reduce((total, log) => total + log.hours, 0);
  }

  calculateAmount(hours: number): number {
    if (this.paymentModel === 'hourly' && this.hourlyRate) {
      return hours * this.hourlyRate;
    } else if (this.paymentModel === 'weekly' && this.weeklyRate) {
      // Assuming 40 hours per week
      return (hours / 40) * this.weeklyRate;
    }
    return 0;
  }

  // Format currency amount
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Get payment method display text
  getPaymentMethodDisplay(method: PaymentMethod): string {
    if (method.type === 'card' && method.card) {
      return `${method.card.brand} •••• ${method.card.last4}`;
    }
    return 'Payment method';
  }

  // Get log status badge class
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }
}
