// frontend/src/app/features/onboarding/onboarding.component.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
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

  // Forms for different steps
  basicInfoForm!: FormGroup;
  profileTypeForm!: FormGroup;
  talentProfileForm!: FormGroup;
  clientProfileForm!: FormGroup;

  loading = false;
  error: string | null = null;

  // Track steps completion
  stepsCompleted = {
    'basic-info': false,
    'profile-type': false,
    'profile-details': false,
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.initForms();

    // Get current user data and determine starting step
    this.userService.getCurrentUser().subscribe({
      next: (userData) => {
        this.currentStep = userData.currentOnboardingStep || 'initial';

        // If onboarding is already completed, redirect to profile
        if (userData.user.metadata.onboardingCompleted) {
          this.router.navigate(['/profile']);
          return;
        }

        // Pre-fill forms with existing data if available
        this.populateFormsWithUserData(userData);
      },
      error: (err) => {
        console.error('Error fetching user data:', err);
        this.error = 'Failed to load profile data. Please try again.';
      },
    });
  }

  initForms() {
    // Basic info form
    this.basicInfoForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
    });

    // Profile type selection form
    this.profileTypeForm = this.fb.group({
      role: ['talent', [Validators.required]],
    });

    // Talent profile form
    this.talentProfileForm = this.fb.group({
      title: ['', [Validators.required]],
      bio: ['', [Validators.required, Validators.minLength(100)]],
      skills: ['', [Validators.required]],
      hourlyRate: [null, [Validators.required, Validators.min(1)]],
      availability: ['freelance'],
      location: this.fb.group({
        country: ['', [Validators.required]],
        city: ['', [Validators.required]],
        remote: [true],
      }),
      website: [''],
      linkedin: [''],
      github: [''],
      // Advanced sections - could be expanded later
      education: this.fb.array([]),
      experience: this.fb.array([]),
      languages: this.fb.array([]),
      portfolio: this.fb.array([]),
    });

    // Client profile form
    this.clientProfileForm = this.fb.group({
      companyName: ['', [Validators.required]],
      industry: ['', [Validators.required]],
      companySize: ['1-10'],
      description: ['', [Validators.required, Validators.minLength(100)]],
      website: [''],
      location: this.fb.group({
        country: ['', [Validators.required]],
        city: ['', [Validators.required]],
        address: [''],
      }),
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: [''],
      socialMedia: this.fb.group({
        linkedin: [''],
        twitter: [''],
        facebook: [''],
        instagram: [''],
      }),
      preferredSkills: [''],
    });
  }

  populateFormsWithUserData(userData: any) {
    const { user, profile } = userData;

    // Fill basic info form
    if (user) {
      this.basicInfoForm.patchValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    }

    // Set role if defined
    if (user && user.role) {
      this.profileTypeForm.patchValue({
        role: user.role,
      });
    }

    // Fill appropriate profile form based on role
    if (profile) {
      if (this.userService.isTalentProfile(profile)) {
        // Fill talent profile form
        this.talentProfileForm.patchValue({
          title: profile.title || '',
          bio: profile.bio || '',
          skills: profile.skills ? profile.skills.join(', ') : '',
          hourlyRate: profile.hourlyRate || null,
          availability: profile.availability || 'freelance',
          location: {
            country: profile.location?.country || '',
            city: profile.location?.city || '',
            remote: profile.location?.remote ?? true,
          },
          website: profile.website || '',
          linkedin: profile.linkedin || '',
          github: profile.github || '',
        });
      } else if (this.userService.isClientProfile(profile)) {
        // Fill client profile form
        this.clientProfileForm.patchValue({
          companyName: profile.companyName || '',
          industry: profile.industry || '',
          companySize: profile.companySize || '1-10',
          description: profile.description || '',
          website: profile.website || '',
          location: {
            country: profile.location?.country || '',
            city: profile.location?.city || '',
            address: profile.location?.address || '',
          },
          contactEmail: profile.contactEmail || user.email || '',
          contactPhone: profile.contactPhone || '',
          socialMedia: {
            linkedin: profile.socialMedia?.linkedin || '',
            twitter: profile.socialMedia?.twitter || '',
            facebook: profile.socialMedia?.facebook || '',
            instagram: profile.socialMedia?.instagram || '',
          },
          preferredSkills: profile.preferredSkills
            ? profile.preferredSkills.join(', ')
            : '',
        });
      }
    }
  }

  onBasicInfoSubmit() {
    if (this.basicInfoForm.invalid) {
      this.markFormGroupTouched(this.basicInfoForm);
      return;
    }

    this.loading = true;
    const basicInfoData = this.basicInfoForm.value;

    this.userService.updateUserInfo(basicInfoData).subscribe({
      next: () => {
        this.loading = false;
        this.currentStep = 'profile-type';
        this.stepsCompleted['basic-info'] = true;
        this.userService.updateOnboardingStep('profile-type').subscribe();
      },
      error: (err) => {
        console.error('Error updating basic info:', err);
        this.loading = false;
        this.error = 'Failed to save basic information. Please try again.';
      },
    });
  }

  onProfileTypeSubmit() {
    if (this.profileTypeForm.invalid) {
      return;
    }

    this.loading = true;
    const { role } = this.profileTypeForm.value;

    this.userService.setUserRole(role).subscribe({
      next: () => {
        this.loading = false;
        this.currentStep = 'profile-details';
        this.stepsCompleted['profile-type'] = true;
      },
      error: (err) => {
        console.error('Error setting user role:', err);
        this.loading = false;
        this.error = 'Failed to set user role. Please try again.';
      },
    });
  }

  onTalentProfileSubmit() {
    if (this.talentProfileForm.invalid) {
      this.markFormGroupTouched(this.talentProfileForm);
      return;
    }

    this.loading = true;

    // Process the form values
    const formValues = { ...this.talentProfileForm.value };

    // Convert skills from comma-separated string to array
    if (typeof formValues.skills === 'string') {
      formValues.skills = formValues.skills
        .split(',')
        .map((skill: string) => skill.trim())
        .filter((skill: string) => skill.length > 0);
    }

    this.userService.updateTalentProfile(formValues).subscribe({
      next: () => {
        this.loading = false;
        this.stepsCompleted['profile-details'] = true;
        this.router.navigate(['/profile']);
        this.userService.startStripeConnectOnboarding().subscribe({
          next: (res) => (window.location.href = res.url), // 🚀 Redirect to onboarding
          error: () => this.router.navigate(['/profile']), // fallback
        });
      },
      error: (err) => {
        console.error('Error updating talent profile:', err);
        this.loading = false;
        this.error = 'Failed to save talent profile. Please try again.';
      },
    });
  }

  onClientProfileSubmit() {
    if (this.clientProfileForm.invalid) {
      this.markFormGroupTouched(this.clientProfileForm);
      return;
    }

    this.loading = true;

    // Process the form values
    const formValues = { ...this.clientProfileForm.value };

    // Convert preferredSkills from comma-separated string to array
    if (typeof formValues.preferredSkills === 'string') {
      formValues.preferredSkills = formValues.preferredSkills
        .split(',')
        .map((skill: string) => skill.trim())
        .filter((skill: string) => skill.length > 0);
    }

    this.userService.updateClientProfile(formValues).subscribe({
      next: () => {
        this.loading = false;
        this.stepsCompleted['profile-details'] = true;
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        console.error('Error updating client profile:', err);
        this.loading = false;
        this.error = 'Failed to save client profile. Please try again.';
      },
    });
  }

  // Helper method to mark all controls as touched to trigger validation
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper methods to navigate between steps
  goToStep(step: string) {
    this.currentStep = step;
  }

  skipStep() {
    switch (this.currentStep) {
      case 'basic-info':
        this.userService.updateOnboardingStep('profile-type').subscribe(() => {
          this.currentStep = 'profile-type';
        });
        break;
      case 'profile-type':
        // Cannot skip role selection
        break;
      case 'profile-details':
        this.userService.completeOnboarding().subscribe(() => {
          this.router.navigate(['/profile']);
        });
        break;
    }
  }

  // Get current role
  getCurrentRole(): string {
    return this.profileTypeForm.get('role')?.value || 'talent';
  }
}
