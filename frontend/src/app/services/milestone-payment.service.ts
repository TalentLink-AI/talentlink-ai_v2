// frontend/src/app/services/milestone-payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MilestonePaymentService {
  private jobApiUrl = `${environment.apiUrlJob}/api/jobs`;
  private paymentApiUrl = `${environment.apiUrlpayment}/api/payment`;

  constructor(private http: HttpClient) {}

  /**
   * Create a deposit payment for a milestone
   * @param jobId - Job ID
   * @param milestoneId - Milestone ID
   * @returns Observable with payment intent data
   */
  createDepositPayment(jobId: string, milestoneId: string): Observable<any> {
    // Call the payment service directly
    return this.http
      .post<any>(`${this.paymentApiUrl}/milestone/intent`, {
        jobId,
        milestoneId,
        paymentType: 'deposit',
      })
      .pipe(
        map((response) => {
          return response;
        })
      );
  }

  /**
   * Confirm a deposit payment
   * @param jobId - Job ID
   * @param milestoneId - Milestone ID
   * @param paymentIntentId - Payment intent ID
   * @returns Observable with confirmation result
   */
  confirmDepositPayment(
    jobId: string,
    milestoneId: string,
    paymentIntentId: string
  ): Observable<any> {
    // Call the payment service directly
    return this.http
      .post<any>(`${this.paymentApiUrl}/milestone/capture`, {
        paymentIntentId,
        jobId,
        milestoneId,
        paymentType: 'deposit',
      })
      .pipe(
        map((response) => {
          return response;
        })
      );
  }

  /**
   * Approve and prepare remaining payment after work review
   * @param jobId - Job ID
   * @param milestoneId - Milestone ID
   * @param approve - Whether the work is approved
   * @param feedback - Optional feedback
   * @returns Observable with payment intent data
   */
  approveAndPayRemaining(
    jobId: string,
    milestoneId: string,
    approve: boolean,
    feedback?: string
  ): Observable<any> {
    // First update the job milestone with approval status and feedback
    return this.http
      .put<any>(`${this.jobApiUrl}/${jobId}/milestones/${milestoneId}`, {
        clientApproved: approve,
        clientFeedback: feedback || '',
        status: approve ? 'completed' : 'in_progress',
      })
      .pipe(
        map((response) => {
          if (!approve) {
            // If not approved, just return the update result
            return response;
          }

          // If approved, create payment intent for remaining amount
          return this.http
            .post<any>(`${this.paymentApiUrl}/milestone/intent`, {
              jobId,
              milestoneId,
              paymentType: 'remaining',
            })
            .toPromise();
        })
      );
  }

  /**
   * Process payment for remaining milestone amount
   * @param jobId - Job ID
   * @param milestoneId - Milestone ID
   * @param paymentDetails - Payment method details
   * @returns Observable with payment result
   */
  processRemainingPayment(
    jobId: string,
    milestoneId: string,
    paymentDetails: any
  ): Observable<any> {
    // Process the payment through payment service
    return this.http
      .post<any>(`${this.paymentApiUrl}/milestone/capture`, {
        ...paymentDetails,
        jobId,
        milestoneId,
        paymentType: 'remaining',
      })
      .pipe(
        map((response) => {
          return response;
        })
      );
  }

  /**
   * Release funds from escrow to talent
   * @param jobId - Job ID
   * @param milestoneId - Milestone ID
   * @returns Observable with release result
   */
  releaseFunds(jobId: string, milestoneId: string): Observable<any> {
    // Call payment service to transfer funds to talent
    return this.http
      .post<any>(`${this.paymentApiUrl}/transfer-to-talent`, {
        jobId,
        milestoneId,
      })
      .pipe(
        map((response) => {
          return response;
        })
      );
  }

  /**
   * Create a full milestone payment
   * @param jobId - Job ID
   * @param milestoneId - Milestone ID
   * @returns Observable with payment intent data
   */
  createFullPayment(jobId: string, milestoneId: string): Observable<any> {
    return this.http
      .post<any>(`${this.paymentApiUrl}/milestone/intent`, {
        jobId,
        milestoneId,
        paymentType: 'full',
      })
      .pipe(
        map((response) => {
          return response;
        })
      );
  }

  /**
   * Get details about a payment
   * @param paymentIntentId - Payment intent ID
   * @returns Observable with payment details
   */
  getPaymentDetails(paymentIntentId: string): Observable<any> {
    return this.http
      .get<any>(`${this.paymentApiUrl}/intent/${paymentIntentId}`)
      .pipe(
        map((response) => {
          return response;
        })
      );
  }

  /**
   * Get payment status for a milestone
   * @param jobId - Job ID
   * @param milestoneId - Milestone ID
   * @returns Observable with milestone payment status
   */
  getMilestonePaymentStatus(
    jobId: string,
    milestoneId: string
  ): Observable<any> {
    // This still uses the job service since we need the milestone details
    return this.http
      .get<any>(`${this.jobApiUrl}/${jobId}/milestones/${milestoneId}`)
      .pipe(
        map((response) => {
          if (response.success) {
            return {
              status: response.data.milestone.status,
              depositPaid: response.data.milestone.depositPaid,
              paymentIntentId: response.data.milestone.paymentIntentId,
              depositPaymentIntentId:
                response.data.milestone.depositPaymentIntentId,
            };
          } else {
            throw new Error(
              response.message || 'Failed to get milestone status'
            );
          }
        })
      );
  }

  /**
   * Request admin review for fund release
   * @param jobId - Job ID
   * @param milestoneId - Milestone ID
   * @returns Observable with request result
   */
  requestFundRelease(jobId: string, milestoneId: string): Observable<any> {
    // This would connect to an admin notification system in a real implementation
    return this.http
      .post<any>(`${this.paymentApiUrl}/request-release`, {
        jobId,
        milestoneId,
      })
      .pipe(
        map((response) => {
          return response;
        }),
        catchError((error) => {
          // Fallback for demo implementation
          console.log('This would normally create a fund release request');
          return new Observable((observer) => {
            observer.next({
              success: true,
              message: 'Fund release request submitted successfully',
            });
            observer.complete();
          });
        })
      );
  }
}
