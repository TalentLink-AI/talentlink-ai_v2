// stripe.service.ts
import { Injectable } from '@angular/core';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripeCardElement,
} from '@stripe/stripe-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private stripePromise: Promise<Stripe | null>;
  private elements: StripeElements | null = null;
  private card: StripeCardElement | null = null;

  constructor() {
    this.stripePromise = loadStripe(environment.stripePublishableKey);
  }

  async getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }

  async getElements(clientSecret: string): Promise<StripeElements> {
    if (!this.elements) {
      const stripe = await this.getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      this.elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          // Customize as needed
        },
      });
    }
    return this.elements;
  }

  async createCardElement(
    clientSecret: string,
    elementId: string
  ): Promise<StripeCardElement> {
    const elements = await this.getElements(clientSecret);
    this.card = elements.create('card');
    this.card.mount(`#${elementId}`);
    return this.card;
  }

  async confirmCardPayment(clientSecret: string): Promise<any> {
    const stripe = await this.getStripe();
    if (!stripe || !this.card) {
      throw new Error('Stripe or card element not initialized');
    }

    return stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: this.card },
    });
  }

  destroyCardElement(): void {
    if (this.card) {
      this.card.unmount();
      this.card = null;
    }
  }
}
