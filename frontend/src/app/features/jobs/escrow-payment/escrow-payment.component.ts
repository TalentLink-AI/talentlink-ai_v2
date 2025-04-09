// src/app/features/jobs/escrow-payment/escrow-payment.component.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';
import { JobService } from '../../../services/job.service';

@Component({
  selector: 'app-escrow-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './escrow-payment.component.html',
  styleUrls: ['./escrow-payment.component.scss'],
})
export class EscrowPaymentComponent implements OnInit {
  private stripe!: Stripe;
  private cardElement: any;

  // Flow control
  currentStep: 'review' | 'payment' | 'release' = 'review';
  isProcessing = false;
  errorMessage = '';
  statusMessage = '';

  // Data
  jobId: string | null = null;
  milestoneId: string | null = null;
  job: any = null;
  milestone: any = null;

  // Forms
  reviewForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService
  ) {
    this.reviewForm = this.fb.group({
      feedback: [''],
      approval: [true, Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.jobId = params['jobId'];
      this.milestoneId = params['milestoneId'];
      this.currentStep = params['step'] || 'review';

      if (this.jobId && this.milestoneId) {
        this.loadMilestoneDetails();
      }
    });
  }

  async loadMilestoneDetails(): Promise<void> {
    if (!this.jobId || !this.milestoneId) return;

    try {
      const response = await this.jobService
        .getMilestoneDetails(this.jobId, this.milestoneId)
        .toPromise();

      if (response && response.data) {
        this.job = response.data.job;
        this.milestone = response.data.milestone;

        // Determine which step to show based on milestone status
        if (
          this.milestone.status === 'pending' &&
          !this.milestone.clientApproved
        ) {
          this.currentStep = 'review';
        } else if (
          this.milestone.status === 'pending' &&
          this.milestone.clientApproved
        ) {
          this.currentStep = 'payment';
        } else if (this.milestone.status === 'escrowed') {
          this.currentStep = 'release';
        }
      }
    } catch (err) {
      // Type the error properly
      const error = err as Error;
      this.errorMessage = 'Failed to load milestone details';
      console.error(error);
    }
  }

  returnToJob(): void {
    if (this.jobId) {
      this.router.navigate(['/jobs', this.jobId]);
    } else {
      this.router.navigate(['/jobs']);
    }
  }
}
