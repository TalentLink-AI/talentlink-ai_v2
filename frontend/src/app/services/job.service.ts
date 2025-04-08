// src/app/services/job.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Job {
  _id: string;
  title: string;
  description: string;
  budget: number;
  status: 'draft' | 'published' | 'assigned' | 'completed' | 'cancelled';
  clientId: string;
  assignedTo?: string;
  applications?: string[];
  milestones?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JobApplication {
  _id: string;
  jobId: string;
  talentId: string;
  coverLetter?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private apiUrl = `${environment.apiUrlJob}/api`;

  constructor(private http: HttpClient) {}

  // Get all jobs
  getJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs`);
  }

  // Get a specific job by ID
  getJobById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs/${id}`);
  }

  // Get jobs created by the current client
  getMyJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs/my-jobs`);
  }

  // Get jobs created by a specific client
  getJobsByClient(clientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs/client/${clientId}`);
  }

  // Get jobs that a talent can apply to (not assigned yet)
  getAvailableJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs/available`);
  }

  // Create a new job
  createJob(job: Partial<Job>): Observable<any> {
    const jobData = { ...job };
    delete jobData.clientId;
    return this.http.post(`${this.apiUrl}/jobs`, jobData);
  }

  // Update a job
  updateJob(id: string, updates: Partial<Job>): Observable<any> {
    return this.http.put(`${this.apiUrl}/jobs/${id}`, updates);
  }

  // Update job status
  updateJobStatus(
    id: string,
    status: string,
    assignedTo?: string
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/jobs/${id}/status`, {
      status,
      assignedTo,
    });
  }

  // Apply to a job
  applyToJob(jobId: string, coverLetter?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/applications`, {
      jobId,
      coverLetter,
    });
  }

  // Get applications for a job
  getApplicationsForJob(jobId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/applications/job/${jobId}`);
  }

  // Get applications by talent
  getApplicationsByTalent(talentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/applications/talent/${talentId}`);
  }

  // Get my applications (for logged in talent)
  getMyApplications(): Observable<any> {
    return this.http.get(`${this.apiUrl}/applications/my-applications`);
  }

  // Accept an application
  acceptApplication(applicationId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/applications/${applicationId}/accept`,
      {}
    );
  }

  // Reject an application
  rejectApplication(applicationId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/applications/${applicationId}/reject`,
      {}
    );
  }

  /**
   * Create a milestone
   */
  createMilestone(
    jobId: string,
    description: string,
    amount: number,
    depositAmount?: number
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/jobs/${jobId}/milestones`, {
      description,
      amount,
      depositAmount,
    });
  }

  // Update a milestone
  updateMilestone(
    jobId: string,
    milestoneId: string,
    updates: any
  ): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}`,
      updates
    );
  }

  // Release milestone payment
  releaseMilestone(jobId: string, milestoneId: string): Observable<any> {
    // First, get the milestone details to include in the request
    return this.getJobById(jobId).pipe(
      switchMap((jobResponse) => {
        if (!jobResponse || !jobResponse.data) {
          return throwError(() => new Error('Job not found'));
        }

        const job = jobResponse.data;

        // Find the milestone
        const milestone = job.milestones?.find(
          (m: any) => m._id === milestoneId
        );

        if (!milestone) {
          return throwError(() => new Error('Milestone not found'));
        }

        // Send all possible required fields with the release request
        return this.http.post(
          `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/release`,
          {
            description: milestone.description || 'Milestone payment',
            paymentIntentId: milestone.paymentIntentId,
            amount: milestone.amount,
            status: milestone.status,
          }
        );
      })
    );
  }

  // Create milestone payment intent
  createMilestonePayment(jobId: string, milestoneId: string): Observable<any> {
    // First get the job to retrieve the milestone amount
    return this.getJobById(jobId).pipe(
      switchMap((jobResponse) => {
        if (!jobResponse || !jobResponse.data) {
          return throwError(() => new Error('Job not found'));
        }

        const job = jobResponse.data;

        // Find the specific milestone to get its amount
        const milestone = job.milestones?.find(
          (m: any) => m._id === milestoneId
        );

        if (!milestone) {
          return throwError(() => new Error('Milestone not found'));
        }

        // Convert the amount to cents for Stripe
        const amountInCents = Math.round(milestone.amount * 100);

        // Now make the payment intent request with the correct amount
        return this.http.post(
          `${environment.apiUrlpayment}/api/payment/milestone/intent`,
          {
            amount: amountInCents,
            currency: 'usd',
            customerId: 'cus_S4MTmqux34KQ6n', //FIGURE OUY HOT TO GET CUSTOMER ID TODO
            payerId: job.clientId,
            payeeId: job.assignedTo,
            projectId: job._id,
            milestoneId: milestoneId,
            description: `Milestone payment for ${job.title}: ${milestone.description}`,
          }
        );
      })
    );
  }

  // Complete a job
  completeJob(jobId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/jobs/${jobId}/complete`, {});
  }

  /**
   * Get milestone details
   */
  getMilestoneDetails(jobId: string, milestoneId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}`
    );
  }

  /**
   * Pay deposit for a milestone
   */
  payMilestoneDeposit(jobId: string, milestoneId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/deposit`,
      {}
    );
  }

  /**
   * Confirm milestone deposit payment
   */
  confirmMilestoneDeposit(
    jobId: string,
    milestoneId: string,
    paymentIntentId: string
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/confirm-deposit`,
      { paymentIntentId }
    );
  }

  /**
   * Talent starts work on a milestone
   */
  startMilestoneWork(jobId: string, milestoneId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/start`,
      {}
    );
  }

  /**
   * Talent completes work on a milestone
   */
  completeMilestoneWork(
    jobId: string,
    milestoneId: string,
    submissionDetails?: string
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/complete`,
      { submissionDetails }
    );
  }

  /**
   * Client reviews and pays remaining milestone amount
   */
  reviewAndPayRemainingMilestone(
    jobId: string,
    milestoneId: string,
    approve: boolean,
    clientFeedback?: string
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/review`,
      { approve, clientFeedback }
    );
  }

  approveMilestoneReview(
    jobId: string,
    milestoneId: string,
    feedback: string,
    approval: boolean
  ): Observable<any> {
    console.log(
      `Calling approve-review with jobId: ${jobId}, milestoneId: ${milestoneId}`
    );
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/approve-review`,
      { feedback, approvalStatus: approval }
    );
  }

  // Pay remaining milestone amount (escrow)
  payRemainingMilestone(
    jobId: string,
    milestoneId: string,
    paymentDetails: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/pay-remaining`,
      paymentDetails
    );
  }

  // Release escrowed funds
  releaseMilestoneFunds(jobId: string, milestoneId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/release-funds`,
      {}
    );
  }

  /**
   * Create milestone payment intent for remaining amount
   * This is used after the client reviews and approves the work
   */
  createRemainingMilestonePayment(
    jobId: string,
    milestoneId: string,
    paymentIntentId: string
  ): Observable<any> {
    // Get the job first to retrieve milestone data
    return this.getJobById(jobId).pipe(
      switchMap((jobResponse) => {
        if (!jobResponse || !jobResponse.data) {
          return throwError(() => new Error('Job not found'));
        }

        const job = jobResponse.data;
        const milestone = job.milestones?.find(
          (m: any) => m._id === milestoneId
        );

        if (!milestone) {
          return throwError(() => new Error('Milestone not found'));
        }

        // Calculate remaining amount
        const totalAmount = milestone.amount;
        const depositAmount = milestone.depositAmount || totalAmount * 0.1;
        const remainingAmount = Math.round((totalAmount - depositAmount) * 100);

        // Now make the payment intent request for the remaining amount
        return this.http.post(
          `${environment.apiUrlpayment}/api/payment/milestone/intent`,
          {
            amount: remainingAmount,
            currency: 'usd',
            customerId: 'cus_123456', // TODO: Get from user profile
            payerId: job.clientId,
            payeeId: job.assignedTo,
            projectId: job._id,
            milestoneId: milestoneId,
            description: `Remaining payment for milestone: ${milestone.description}`,
          }
        );
      })
    );
  }

  /**
   * Process milestone payment by milestone status
   */
  processMilestonePayment(
    jobId: string,
    milestoneId: string,
    status: string
  ): Observable<any> {
    if (status === 'pending') {
      return this.payMilestoneDeposit(jobId, milestoneId);
    } else if (status === 'completed') {
      return this.reviewAndPayRemainingMilestone(jobId, milestoneId, true);
    } else {
      return throwError(
        () =>
          new Error(`Cannot process payment for milestone in ${status} status`)
      );
    }
  }
}
