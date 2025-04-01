// frontend/src/app/features/onboarding/onboarding.component.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService, UserProfile } from '../../services/user.service';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
})
export class OnboardingComponent implements OnInit {
  currentStep = 'initial';
  basicInfoForm!: FormGroup;
  skillsForm!: FormGroup;
  preferencesForm!: FormGroup;
  loading = false;
  error: string | null = null;
  userProfile: UserProfile | null = null;

  // Track steps completion
  stepsCompleted = {
    'basic-info': false,
    skills: false,
    preferences: false,
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.initForms();

    // Get current user profile and determine starting step
    this.userService.getCurrentUser().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.currentStep = profile.currentOnboardingStep || 'initial';

        // If onboarding is already completed, redirect to profile
        if (profile.metadata.onboardingCompleted) {
          this.router.navigate(['/profile']);
        }

        // Pre-fill forms with existing data if available
        this.populateFormsWithUserData(profile);
      },
      error: (err) => {
        console.error('Error fetching user profile:', err);
        this.error = 'Failed to load profile data. Please try again.';
      },
    });
  }

  initForms() {
    // Basic info form
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required]],
      title: ['', [Validators.required]],
      location: ['', [Validators.required]],
      bio: [''],
    });

    // Skills form
    this.skillsForm = this.fb.group({
      skills: ['', [Validators.required]], // Will be split into array
      linkedin: [''],
      github: [''],
    });

    // Preferences form
    this.preferencesForm = this.fb.group({
      phoneNumber: [''],
      website: [''],
    });
  }

  populateFormsWithUserData(profile: UserProfile) {
    // Fill basic info form
    if (profile.profile) {
      this.basicInfoForm.patchValue({
        name: profile.profile.name || '',
        title: profile.profile.title || '',
        location: profile.profile.location || '',
        bio: profile.profile.bio || '',
      });

      // Fill skills form
      this.skillsForm.patchValue({
        skills: profile.profile.skills ? profile.profile.skills.join(', ') : '',
        linkedin: profile.profile.linkedin || '',
        github: profile.profile.github || '',
      });

      // Fill preferences form
      this.preferencesForm.patchValue({
        phoneNumber: profile.profile.phoneNumber || '',
        website: profile.profile.website || '',
      });
    }
  }

  onBasicInfoSubmit() {
    if (this.basicInfoForm.invalid) {
      return;
    }

    this.loading = true;
    const basicInfoData = this.basicInfoForm.value;

    this.userService.updateOnboardingStep('skills', basicInfoData).subscribe({
      next: (profile) => {
        this.loading = false;
        this.currentStep = 'skills';
        this.stepsCompleted['basic-info'] = true;
      },
      error: (err) => {
        console.error('Error updating basic info:', err);
        this.loading = false;
        this.error = 'Failed to save basic information. Please try again.';
      },
    });
  }

  onSkillsSubmit() {
    if (this.skillsForm.invalid) {
      return;
    }

    this.loading = true;
    const skillsData = {
      ...this.skillsForm.value,
      skills: this.skillsForm.value.skills
        .split(',')
        .map((skill: string) => skill.trim()),
    };

    this.userService.updateOnboardingStep('preferences', skillsData).subscribe({
      next: (profile) => {
        this.loading = false;
        this.currentStep = 'preferences';
        this.stepsCompleted['skills'] = true;
      },
      error: (err) => {
        console.error('Error updating skills:', err);
        this.loading = false;
        this.error = 'Failed to save skills. Please try again.';
      },
    });
  }

  onPreferencesSubmit() {
    this.loading = true;
    const preferencesData = this.preferencesForm.value;

    this.userService
      .updateOnboardingStep('completed', preferencesData)
      .subscribe({
        next: (profile) => {
          this.loading = false;
          this.stepsCompleted['preferences'] = true;

          // Redirect to profile page after completion
          this.router.navigate(['/profile']);
        },
        error: (err) => {
          console.error('Error updating preferences:', err);
          this.loading = false;
          this.error = 'Failed to save preferences. Please try again.';
        },
      });
  }

  // Helper methods to navigate between steps manually
  goToStep(step: string) {
    this.currentStep = step;
  }

  skipStep() {
    switch (this.currentStep) {
      case 'basic-info':
        this.userService.updateOnboardingStep('skills').subscribe(() => {
          this.currentStep = 'skills';
        });
        break;
      case 'skills':
        this.userService.updateOnboardingStep('preferences').subscribe(() => {
          this.currentStep = 'preferences';
        });
        break;
      case 'preferences':
        this.userService.completeOnboarding().subscribe(() => {
          this.router.navigate(['/profile']);
        });
        break;
    }
  }
}
