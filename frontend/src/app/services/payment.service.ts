// src/app/services/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MilestonePaymentParams {
  amount: number;
  currency?: string;
  customerId?: string;
  payerId: string;
  payeeId: string;
  projectId: string;
  milestoneId: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl = environment.apiUrlpayment || 'http://localhost:3002';

  constructor(private http: HttpClient) {}

  // Standard payment intent
  createPaymentIntent(amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/payment/intent`, {
      amount,
      currency: 'usd',
    });
  }

  // Create milestone payment intent (with manual capture)
  createMilestonePaymentIntent(
    params: MilestonePaymentParams
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/payment/milestone/intent`, {
      amount: params.amount,
      currency: params.currency || 'usd',
      customerId: params.customerId || 'cus_123456', // Default test customer
      payerId: params.payerId,
      payeeId: params.payeeId,
      projectId: params.projectId,
      milestoneId: params.milestoneId,
      description:
        params.description || `Milestone payment for ${params.projectId}`,
    });
  }

  // Capture milestone payment (release funds)
  captureMilestonePayment(paymentIntentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/payment/milestone/capture`, {
      paymentIntentId,
    });
  }

  // Create a customer
  createCustomer(email: string, name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/payment/customers`, {
      email,
      name,
    });
  }

  // Attach payment method to customer
  attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/payment/payment-methods/attach`, {
      paymentMethodId,
      customerId,
    });
  }

  // List payment methods for a customer
  listPaymentMethods(customerId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/api/payment/payment-methods?customerId=${customerId}`
    );
  }

  // Set default payment method
  setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/api/payment/payment-methods/default`,
      {
        customerId,
        paymentMethodId,
      }
    );
  }

  // Process refund
  processRefund(chargeId: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/payment/refund`, {
      chargeId,
      amount,
    });
  }
}
