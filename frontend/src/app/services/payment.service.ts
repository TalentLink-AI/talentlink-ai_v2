// frontend/src/app/services/payment.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, from } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from '../core/services/logger.service';

// These interfaces represent our data models for payment flows
export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface EscrowAccount {
  id: string;
  balance: number;
  contractId: string;
  status: 'active' | 'completed' | 'refunded';
}

export interface PaymentIntent {
  id: string;
  amount: number;
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'processing'
    | 'succeeded'
    | 'canceled';
  clientSecret?: string;
}

export interface ContractPaymentTerms {
  paymentModel: 'milestone' | 'hourly' | 'weekly';
  totalAmount: number;
  escrowId?: string;
  milestones?: MilestonePayment[];
  hourlyRate?: number;
  weeklyRate?: number;
  paymentFrequency?: 'weekly' | 'biweekly' | 'monthly';
}

export interface MilestonePayment {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: 'pending' | 'inProgress' | 'completed' | 'paid';
  dueDate?: Date;
  completedDate?: Date;
  paidDate?: Date;
  paymentIntentId?: string;
}

interface StripePaymentMethodResult {
  error?: {
    message: string;
  };
  paymentMethod?: {
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  };
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private apiUrl = `${environment.apiUrl}/api/payments`;

  // Store Stripe instance
  private stripeInstance: any = null;
  private stripeElements: any = null;

  // Store payment methods for the current user
  private paymentMethodsSubject = new BehaviorSubject<PaymentMethod[]>([]);
  public paymentMethods$ = this.paymentMethodsSubject.asObservable();

  constructor() {
    // Load Stripe.js asynchronously when service is instantiated
    this.loadStripe();
    this.logger.debug(
      `Payment service initialized with API URL: ${this.apiUrl}`
    );
  }

  // Load Stripe.js script
  private loadStripe(): void {
    if (typeof window === 'undefined' || (window as any).Stripe) {
      return;
    }

    this.logger.debug('Loading Stripe.js script');
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      this.stripeInstance = (window as any).Stripe(
        environment.stripe.publicKey
      );
      this.logger.debug('Stripe.js loaded successfully');
    };
    document.body.appendChild(script);
  }

  // Get Stripe instance (with lazy loading)
  private getStripe(): Observable<any> {
    if (this.stripeInstance) {
      return of(this.stripeInstance);
    }

    // If Stripe is not loaded yet, check every 100ms until it's loaded
    return new Observable((observer) => {
      const checkInterval = setInterval(() => {
        if (this.stripeInstance) {
          observer.next(this.stripeInstance);
          observer.complete();
          clearInterval(checkInterval);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.stripeInstance) {
          observer.error('Stripe.js failed to load');
          clearInterval(checkInterval);
        }
      }, 10000);
    });
  }

  // Initialize Stripe Elements
  initializeStripeElements(): Observable<any> {
    return this.getStripe().pipe(
      switchMap((stripe) => {
        // Create elements instance
        const elements = stripe.elements();
        this.stripeElements = elements;
        return of(elements);
      }),
      catchError((error) => {
        this.logger.error('Failed to initialize Stripe Elements', error);
        return of(null);
      })
    );
  }

  // Create a card element for payment form
  createCardElement(elementId: string): Observable<any> {
    return this.getStripe().pipe(
      switchMap((stripe) => {
        if (!this.stripeElements) {
          return this.initializeStripeElements().pipe(
            switchMap((elements) => {
              if (!elements) {
                throw new Error('Failed to initialize Stripe Elements');
              }
              const cardElement = elements.create('card', {
                style: {
                  base: {
                    color: '#32325d',
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '16px',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#dc3545',
                    iconColor: '#dc3545',
                  },
                },
              });

              cardElement.mount(`#${elementId}`);
              return of(cardElement);
            })
          );
        }

        const cardElement = this.stripeElements.create('card');
        cardElement.mount(`#${elementId}`);
        return of(cardElement);
      }),
      catchError((error) => {
        this.logger.error('Failed to create card element', error);
        return of(null);
      })
    );
  }

  // Add a new payment method
  addPaymentMethod(cardElement: any): Observable<PaymentMethod> {
    return this.getStripe().pipe(
      switchMap((stripe) => {
        // Cast the promise result to Observable<StripePaymentMethodResult>
        return from(
          stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
          }) as Promise<StripePaymentMethodResult>
        ).pipe(
          switchMap((result) => {
            if (result.error) {
              throw new Error(result.error.message);
            }

            if (!result.paymentMethod) {
              throw new Error('Payment method creation failed');
            }

            // Send payment method to backend to associate with user
            return this.http
              .post<PaymentMethod>(`${this.apiUrl}/payment-methods`, {
                paymentMethodId: result.paymentMethod.id,
              })
              .pipe(
                tap((paymentMethod) => {
                  // Update payment methods list
                  const currentMethods = this.paymentMethodsSubject.value;
                  this.paymentMethodsSubject.next([
                    ...currentMethods,
                    paymentMethod,
                  ]);
                })
              );
          })
        );
      }),
      catchError((error) => {
        this.logger.error('Failed to add payment method', error);
        throw error;
      })
    );
  }

  // Get user's payment methods
  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http
      .get<PaymentMethod[]>(`${this.apiUrl}/payment-methods`)
      .pipe(
        tap((methods) => {
          this.paymentMethodsSubject.next(methods);
        }),
        catchError((error) => {
          this.logger.error('Failed to get payment methods', error);
          return of([]);
        })
      );
  }

  // Delete a payment method
  deletePaymentMethod(paymentMethodId: string): Observable<boolean> {
    return this.http
      .delete<{ success: boolean }>(
        `${this.apiUrl}/payment-methods/${paymentMethodId}`
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            // Update payment methods list
            const currentMethods = this.paymentMethodsSubject.value;
            const updatedMethods = currentMethods.filter(
              (method) => method.id !== paymentMethodId
            );
            this.paymentMethodsSubject.next(updatedMethods);
          }
        }),
        switchMap((response) => of(response.success)),
        catchError((error) => {
          this.logger.error('Failed to delete payment method', error);
          return of(false);
        })
      );
  }

  // Create escrow account for a contract
  createEscrowForContract(
    contractId: string,
    amount: number
  ): Observable<EscrowAccount> {
    return this.http
      .post<EscrowAccount>(`${this.apiUrl}/escrow`, {
        contractId,
        amount,
      })
      .pipe(
        catchError((error) => {
          this.logger.error('Failed to create escrow account', error);
          throw error;
        })
      );
  }

  // Fund escrow account with a specific payment method
  fundEscrow(
    escrowId: string,
    paymentMethodId: string,
    amount: number
  ): Observable<PaymentIntent> {
    return this.http
      .post<PaymentIntent>(`${this.apiUrl}/escrow/${escrowId}/fund`, {
        paymentMethodId,
        amount,
      })
      .pipe(
        catchError((error) => {
          this.logger.error('Failed to fund escrow account', error);
          throw error;
        })
      );
  }

  // Get escrow balance
  getEscrowBalance(escrowId: string): Observable<number> {
    return this.http
      .get<{ balance: number }>(`${this.apiUrl}/escrow/${escrowId}/balance`)
      .pipe(
        switchMap((response) => of(response.balance)),
        catchError((error) => {
          this.logger.error('Failed to get escrow balance', error);
          return of(0);
        })
      );
  }

  // Release funds from escrow to talent for a milestone
  releaseMilestonePayment(
    contractId: string,
    milestoneId: string
  ): Observable<MilestonePayment> {
    return this.http
      .post<MilestonePayment>(
        `${this.apiUrl}/contracts/${contractId}/milestones/${milestoneId}/release`,
        {}
      )
      .pipe(
        catchError((error) => {
          this.logger.error('Failed to release milestone payment', error);
          throw error;
        })
      );
  }

  // Get all milestones for a contract
  getContractMilestones(contractId: string): Observable<MilestonePayment[]> {
    return this.http
      .get<MilestonePayment[]>(
        `${this.apiUrl}/contracts/${contractId}/milestones`
      )
      .pipe(
        catchError((error) => {
          this.logger.error('Failed to get contract milestones', error);
          return of([]);
        })
      );
  }

  // Update milestone status
  updateMilestoneStatus(
    contractId: string,
    milestoneId: string,
    status: MilestonePayment['status']
  ): Observable<MilestonePayment> {
    return this.http
      .patch<MilestonePayment>(
        `${this.apiUrl}/contracts/${contractId}/milestones/${milestoneId}`,
        {
          status,
        }
      )
      .pipe(
        catchError((error) => {
          this.logger.error('Failed to update milestone status', error);
          throw error;
        })
      );
  }

  // Create payment intent for hourly/weekly payments
  createTimeBasedPayment(
    contractId: string,
    paymentMethodId: string,
    hours: number
  ): Observable<PaymentIntent> {
    return this.http
      .post<PaymentIntent>(
        `${this.apiUrl}/contracts/${contractId}/time-payment`,
        {
          paymentMethodId,
          hours,
        }
      )
      .pipe(
        catchError((error) => {
          this.logger.error('Failed to create time-based payment', error);
          throw error;
        })
      );
  }

  // Get Stripe Connect account link for talents to set up their account
  getConnectAccountLink(): Observable<{ url: string }> {
    return this.http
      .get<{ url: string }>(`${this.apiUrl}/connect/account-link`)
      .pipe(
        catchError((error) => {
          this.logger.error('Failed to get Connect account link', error);
          throw error;
        })
      );
  }

  // Check if talent has completed Stripe Connect onboarding
  checkConnectOnboardingStatus(): Observable<{ completed: boolean }> {
    return this.http
      .get<{ completed: boolean }>(`${this.apiUrl}/connect/status`)
      .pipe(
        catchError((error) => {
          this.logger.error('Failed to check Connect onboarding status', error);
          return of({ completed: false });
        })
      );
  }

  // Get payment transaction history
  getTransactionHistory(page: number = 1, limit: number = 10): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/transactions?page=${page}&limit=${limit}`)
      .pipe(
        catchError((error) => {
          this.logger.error('Failed to get transaction history', error);
          return of({
            transactions: [],
            pagination: {
              total: 0,
              page,
              limit,
              pages: 0,
            },
          });
        })
      );
  }
}
