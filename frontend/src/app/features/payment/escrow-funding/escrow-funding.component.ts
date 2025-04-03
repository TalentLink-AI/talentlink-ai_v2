// frontend/src/app/features/payments/escrow-funding/escrow-funding.component.ts
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

@Component({
  selector: 'app-escrow-funding',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './escrow-funding.component.html',
  styleUrls: ['./escrow-funding.component.scss'],
})
export class EscrowFundingComponent implements OnInit {
  @Input() contractId!: string;
  @Input() escrowId!: string;
  @Input() totalAmount: number = 0;

  escrowForm!: FormGroup;
  paymentMethods: PaymentMethod[] = [];
  escrowBalance: number = 0;
  loading = false;
  paymentInProgress = false;
  showPaymentForm = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadPaymentMethods();

    // If escrow ID is provided, load the current balance
    if (this.escrowId) {
      this.loadEscrowBalance();
    }
  }

  initForm(): void {
    this.escrowForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      paymentMethodId: ['', Validators.required],
    });

    // Set default amount to total contract amount if provided
    if (this.totalAmount) {
      this.escrowForm.patchValue({ amount: this.totalAmount });
    }
  }

  loadPaymentMethods(): void {
    this.loading = true;
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.loading = false;

        // If we have at least one payment method, select it by default
        if (this.paymentMethods.length > 0) {
          this.escrowForm.patchValue({
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

  loadEscrowBalance(): void {
    this.loading = true;
    this.paymentService.getEscrowBalance(this.escrowId).subscribe({
      next: (balance) => {
        this.escrowBalance = balance;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.logger.error('Error loading escrow balance', error);
      },
    });
  }

  togglePaymentForm(): void {
    this.showPaymentForm = !this.showPaymentForm;
    this.error = null;
    this.success = null;
  }

  // For client side only - to create a new escrow account
  createEscrowAccount(): void {
    if (!this.contractId) {
      this.error = 'Contract ID is required';
      return;
    }

    const amount = this.escrowForm.get('amount')?.value;

    if (!amount) {
      this.error = 'Amount is required';
      return;
    }

    this.loading = true;
    this.error = null;

    this.paymentService
      .createEscrowForContract(this.contractId, amount)
      .subscribe({
        next: (escrow) => {
          this.escrowId = escrow.id;
          this.escrowBalance = escrow.balance;
          this.loading = false;
          this.success = 'Escrow account created successfully';

          // Now fund the escrow
          this.fundEscrow();
        },
        error: (error) => {
          this.loading = false;
          this.error = 'Failed to create escrow account';
          this.logger.error('Error creating escrow account', error);
        },
      });
  }

  fundEscrow(): void {
    if (!this.escrowId) {
      // If no escrow ID exists, create one first
      this.createEscrowAccount();
      return;
    }

    if (this.escrowForm.invalid) {
      this.error = 'Please fill in all required fields';
      return;
    }

    const { amount, paymentMethodId } = this.escrowForm.value;

    this.paymentInProgress = true;
    this.error = null;
    this.success = null;

    this.paymentService
      .fundEscrow(this.escrowId, paymentMethodId, amount)
      .subscribe({
        next: (paymentIntent) => {
          this.paymentInProgress = false;

          if (paymentIntent.status === 'succeeded') {
            // Payment succeeded immediately
            this.success = 'Escrow funded successfully!';
            this.escrowBalance += amount;
            this.showPaymentForm = false;
          } else if (paymentIntent.status === 'processing') {
            // Payment is being processed
            this.success =
              'Payment is processing. Escrow will be updated soon.';
          } else if (paymentIntent.clientSecret) {
            // Handle any additional actions required (3D Secure, etc.)
            this.handleAdditionalPaymentActions(paymentIntent.clientSecret);
          }

          // Clear form
          this.escrowForm.reset();

          // Clear success message after 5 seconds
          setTimeout(() => {
            this.success = null;
          }, 5000);
        },
        error: (error) => {
          this.paymentInProgress = false;
          this.error = error.message || 'Failed to fund escrow account';
          this.logger.error('Error funding escrow', error);
        },
      });
  }

  handleAdditionalPaymentActions(clientSecret: string): void {
    // This would need to use Stripe.js to handle authentication
    // For now, just show a message that additional verification might be needed
    this.success =
      'Your payment may require additional verification. Please check your email or banking app.';
  }

  // Format currency amount
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Helper to get payment method display text
  getPaymentMethodDisplay(method: PaymentMethod): string {
    if (method.type === 'card' && method.card) {
      return `${method.card.brand} •••• ${method.card.last4}`;
    }
    return 'Payment method';
  }

  // Calculate remaining amount to fund
  getRemainingAmount(): number {
    if (!this.totalAmount) return 0;
    return Math.max(0, this.totalAmount - this.escrowBalance);
  }

  // Check if escrow is fully funded
  isFullyFunded(): boolean {
    if (!this.totalAmount) return false;
    return this.escrowBalance >= this.totalAmount;
  }
}
