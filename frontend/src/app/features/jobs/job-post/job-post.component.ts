// src/app/features/jobs/job-post/job-post.component.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JobService } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-job-post',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './job-post.component.html',
  styleUrls: ['./job-post.component.scss'],
})
export class JobPostComponent implements OnInit {
  jobForm: FormGroup;
  isSubmitting = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private jobService: JobService,
    private userService: UserService
  ) {
    this.jobForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      budget: ['', [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.jobForm.invalid) {
      this.jobForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    // For this MVP, we'll use a hardcoded client ID
    const userId = 'client-123';

    this.jobService
      .createJob({
        title: this.jobForm.value.title,
        description: this.jobForm.value.description,
        budget: parseFloat(this.jobForm.value.budget),
        clientId: userId,
      })
      .subscribe({
        next: (job) => {
          this.isSubmitting = false;
          this.router.navigate(['/jobs/manage']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = err.message || 'Failed to create job. Please try again.';
        },
      });
  }
}
