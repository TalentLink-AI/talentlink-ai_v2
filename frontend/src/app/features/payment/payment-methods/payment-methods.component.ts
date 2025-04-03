// frontend/src/app/features/payments/payment-methods/payment-methods.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  PaymentService,
  PaymentMethod,
} from '../../../services/payment.service';
import { LoggerService } from '../../../core/services/logger.service';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './payment-methods.component.html',
  styleUrls: ['./payment-methods.component.scss'],
})
export class PaymentMethodsComponent implements OnInit {
  @ViewChild('cardElement') cardElement!: ElementRef;

  paymentMethods: PaymentMethod[] = [];
  loading = false;
  addingCard = false;
  cardError: string | null = null;
  cardComplete = false;
  cardElementInstance: any = null;
  processingDelete = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private paymentService: PaymentService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.loadPaymentMethods();
  }

  loadPaymentMethods(): void {
    this.loading = true;
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load payment methods';
        this.logger.error('Error loading payment methods', error);
        this.loading = false;
      },
    });
  }

  showAddCard(): void {
    this.addingCard = true;
    this.cardError = null;

    // Initialize the card element after the view is ready
    setTimeout(() => {
      this.initializeCardElement();
    }, 100);
  }

  cancelAddCard(): void {
    this.addingCard = false;
    this.cardError = null;

    // Destroy the card element if it exists
    if (this.cardElementInstance) {
      this.cardElementInstance.destroy();
      this.cardElementInstance = null;
    }
  }

  initializeCardElement(): void {
    // Make sure we have a card element container
    if (!this.cardElement || !this.cardElement.nativeElement) {
      this.logger.error('Card element container not found');
      return;
    }

    // Initialize Stripe Elements
    this.paymentService.initializeStripeElements().subscribe({
      next: (elements) => {
        if (!elements) {
          this.cardError = 'Failed to initialize payment form';
          return;
        }

        this.paymentService.createCardElement('card-element').subscribe({
          next: (cardElement) => {
            if (!cardElement) {
              this.cardError = 'Failed to create card element';
              return;
            }

            this.cardElementInstance = cardElement;

            // Listen for changes in the card element
            this.cardElementInstance.on('change', (event: any) => {
              this.cardComplete = event.complete;
              this.cardError = event.error ? event.error.message : null;
            });
          },
          error: (error) => {
            this.cardError = 'Failed to create card element';
            this.logger.error('Error creating card element', error);
          },
        });
      },
      error: (error) => {
        this.cardError = 'Failed to initialize payment form';
        this.logger.error('Error initializing Stripe Elements', error);
      },
    });
  }

  submitNewCard(): void {
    if (!this.cardElementInstance || !this.cardComplete) {
      this.cardError = 'Please complete the card details';
      return;
    }

    this.loading = true;
    this.cardError = null;

    this.paymentService.addPaymentMethod(this.cardElementInstance).subscribe({
      next: (paymentMethod) => {
        // Add the new payment method to the list
        this.paymentMethods.push(paymentMethod);

        // Reset the form
        this.addingCard = false;
        this.loading = false;
        this.successMessage = 'Payment method added successfully';

        // Destroy the card element
        this.cardElementInstance.destroy();
        this.cardElementInstance = null;

        // Clear the success message after a few seconds
        setTimeout(() => {
          this.successMessage = null;
        }, 5000);
      },
      error: (error) => {
        this.loading = false;
        this.cardError = error.message || 'Failed to add payment method';
        this.logger.error('Error adding payment method', error);
      },
    });
  }

  deletePaymentMethod(paymentMethodId: string): void {
    if (confirm('Are you sure you want to remove this payment method?')) {
      this.processingDelete = true;

      this.paymentService.deletePaymentMethod(paymentMethodId).subscribe({
        next: (result) => {
          if (result) {
            // Remove the payment method from the list
            this.paymentMethods = this.paymentMethods.filter(
              (method) => method.id !== paymentMethodId
            );
            this.successMessage = 'Payment method removed successfully';
          } else {
            this.errorMessage = 'Failed to remove payment method';
          }
          this.processingDelete = false;

          // Clear the messages after a few seconds
          setTimeout(() => {
            this.successMessage = null;
            this.errorMessage = null;
          }, 5000);
        },
        error: (error) => {
          this.errorMessage = 'Failed to remove payment method';
          this.logger.error('Error removing payment method', error);
          this.processingDelete = false;
        },
      });
    }
  }

  // Helper function to get card icon class based on card brand
  getCardIcon(brand: string): string {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'visa-icon';
      case 'mastercard':
        return 'mastercard-icon';
      case 'amex':
        return 'amex-icon';
      case 'discover':
        return 'discover-icon';
      default:
        return 'card-icon';
    }
  }
}
