// payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl = environment.apiUrlpayment;

  constructor(private http: HttpClient) {}

  createPaymentIntent(amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/intent`, {
      amount,
      currency: 'usd',
    });
  }

  createCustomer(email: string, name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/customers`, {
      email,
      name,
    });
  }

  attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/payment-methods/attach`, {
      paymentMethodId,
      customerId,
    });
  }

  listPaymentMethods(customerId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/payment/payment-methods?customerId=${customerId}`
    );
  }
}
