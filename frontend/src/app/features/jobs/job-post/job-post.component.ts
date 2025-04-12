// src/app/features/jobs/comprehensive-job-post/comprehensive-job-post.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { JobService } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';
import { ThemeService } from '../../../services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-comprehensive-job-post',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './job-post.component.html',
  styleUrls: ['./job-post.component.scss'],
})
export class ComprehensiveJobPostComponent implements OnInit, OnDestroy {
  // Main form groups
  jobForm: FormGroup;

  // UI state
  isSubmitting = false;
  currentStep = 1;
  totalSteps = 3;
  error = '';

  isDarkMode = false;
  techStack: string[] = [];
  techInput: string = '';

  // Form options
  categoryOptions = [
    'AI Development',
    'Machine Learning',
    'Data Science',
    'Natural Language Processing',
    'Computer Vision',
    'Robotics',
    'Neural Networks',
    'Deep Learning',
    'Reinforcement Learning',
    'AI Ethics',
    'Other',
  ];

  skillsOptions = [
    'Python',
    'TensorFlow',
    'PyTorch',
    'Keras',
    'Scikit-learn',
    'R',
    'NLP',
    'Computer Vision',
    'SQL',
    'Data Visualization',
    'AWS',
    'Azure',
    'Google Cloud',
    'Docker',
    'Kubernetes',
  ];

  timelineOptions = [
    { value: 'less_than_1_week', label: 'Less than 1 week' },
    { value: '1_to_2_weeks', label: '1-2 weeks' },
    { value: '2_to_4_weeks', label: '2-4 weeks' },
    { value: '1_to_3_months', label: '1-3 months' },
    { value: '3_to_6_months', label: '3-6 months' },
    { value: 'more_than_6_months', label: 'More than 6 months' },
  ];

  visibilityOptions = [
    { value: 'public', label: 'Public - Visible to all talents' },
    { value: 'invite_only', label: 'Invite Only - Only for specific talents' },
  ];

  // Subscriptions
  private themeSubscription: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private jobService: JobService,
    private userService: UserService,
    private themeService: ThemeService
  ) {
    // Initialize the job form
    this.jobForm = this.fb.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(100),
        ],
      ],
      description: ['', [Validators.required, Validators.minLength(20)]],
      budget: ['', [Validators.required, Validators.min(1)]],
      status: ['draft'],
      category: ['AI Development'],
      skills: [[]],
      timeline: ['2_to_4_weeks'],
      location: ['remote'],
      visibility: ['public'],
      attachments: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      (isDark) => (this.isDarkMode = isDark)
    );
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  // Get form controls easily
  get job() {
    return this.jobForm.controls;
  }

  // Add attachment
  addAttachment(): void {
    const attachmentsArray = this.jobForm.get('attachments') as FormArray;
    attachmentsArray.push(
      this.fb.group({
        name: ['', Validators.required],
        url: ['', Validators.required],
        type: [''],
        size: [0],
      })
    );
  }

  get attachments(): FormArray {
    return this.jobForm.get('attachments') as FormArray;
  }

  // Remove attachment
  removeAttachment(index: number): void {
    const attachmentsArray = this.jobForm.get('attachments') as FormArray;
    attachmentsArray.removeAt(index);
  }

  // Helper method to update selected skills
  updateSelectedSkills(skill: string, event: any): void {
    const selectedSkills = [...(this.jobForm.get('skills')?.value || [])];

    if (event.target.checked) {
      if (!selectedSkills.includes(skill)) {
        selectedSkills.push(skill);
      }
    } else {
      const index = selectedSkills.indexOf(skill);
      if (index !== -1) {
        selectedSkills.splice(index, 1);
      }
    }

    this.jobForm.get('skills')?.setValue(selectedSkills);
  }

  // Navigate to next step
  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      // Validate current step before proceeding
      if (this.currentStep === 1 && !this.validateJobBasics()) {
        return;
      }

      this.currentStep++;
      window.scrollTo(0, 0);
    }
  }

  // Navigate to previous step
  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo(0, 0);
    }
  }

  // Validate job basics (first step)
  validateJobBasics(): boolean {
    const requiredFields = ['title', 'description', 'budget'];
    let valid = true;

    requiredFields.forEach((field) => {
      if (this.jobForm.get(field)?.invalid) {
        this.jobForm.get(field)?.markAsTouched();
        valid = false;
      }
    });

    if (!valid) {
      this.error = 'Please fill out all required fields correctly.';
    } else {
      this.error = '';
    }

    return valid;
  }

  uploadAttachment(event: Event, fileType: 'image' | 'video') {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const fileUrl = reader.result as string;
      this.attachments.push(
        this.fb.group({
          name: [file.name],
          url: [fileUrl],
          type: [fileType],
          size: [file.size],
        })
      );
    };

    reader.readAsDataURL(file);
  }

  addTech(tech: string): void {
    if (tech && !this.techStack.includes(tech)) {
      this.techStack.push(tech);
    }
  }

  removeTech(tech: string): void {
    this.techStack = this.techStack.filter((t) => t !== tech);
  }

  // Submit the form
  onSubmit(): void {
    this.isSubmitting = true;
    this.error = '';

    // Prepare job data
    const jobData = { ...this.jobForm.value };

    // Convert budget to number if it's a string
    if (typeof jobData.budget === 'string') {
      jobData.budget = parseFloat(jobData.budget);
    }

    console.log('Submitting job data:', jobData);

    // Call the service to create the job
    this.jobService.createJob(jobData).subscribe({
      next: (response) => {
        console.log('Job created successfully:', response);
        this.isSubmitting = false;
        // Navigate to the job details or list page
        this.router.navigate(['/jobs']);
      },
      error: (err) => {
        console.error('Error creating job:', err);
        this.isSubmitting = false;
        this.error =
          err.error?.message || 'Failed to create job. Please try again.';
      },
    });
  }

  // Cancel form submission
  cancel(): void {
    if (
      confirm('Are you sure you want to cancel? All your changes will be lost.')
    ) {
      this.router.navigate(['/jobs']);
    }
  }
}
