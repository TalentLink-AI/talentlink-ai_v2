// src/app/features/profile/profile-edit.component.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss'],
})
export class ProfileEditComponent implements OnInit {
  profileForm!: FormGroup;
  userData: any = null;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUserData();
  }

  initForm(): void {
    // Initialize with empty form
    if (this.userService.getUserRole() === 'talent') {
      this.profileForm = this.fb.group({
        title: ['', Validators.required],
        bio: ['', [Validators.required, Validators.minLength(100)]],
        skills: ['', Validators.required],
        hourlyRate: [null, [Validators.required, Validators.min(1)]],
        availability: ['freelance'],
        location: this.fb.group({
          country: ['', Validators.required],
          city: ['', Validators.required],
          remote: [true],
        }),
        website: [''],
        linkedin: [''],
        github: [''],
      });
    } else {
      // Client profile form
      this.profileForm = this.fb.group({
        companyName: ['', Validators.required],
        industry: ['', Validators.required],
        companySize: ['1-10'],
        description: ['', [Validators.required, Validators.minLength(100)]],
        location: this.fb.group({
          country: ['', Validators.required],
          city: ['', Validators.required],
          address: [''],
        }),
        contactEmail: ['', [Validators.required, Validators.email]],
        contactPhone: [''],
        website: [''],
        preferredSkills: [''],
      });
    }
  }

  loadUserData(): void {
    this.loading = true;
    this.userService.getCurrentUser().subscribe({
      next: (userData) => {
        this.userData = userData;
        this.populateForm();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading user data:', err);
        this.error = 'Failed to load your profile data. Please try again.';
        this.loading = false;
      },
    });
  }

  populateForm(): void {
    if (!this.userData || !this.userData.profile) return;

    if (this.userService.isTalentProfile(this.userData.profile)) {
      const profile = this.userData.profile;
      this.profileForm.patchValue({
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
    } else if (this.userService.isClientProfile(this.userData.profile)) {
      const profile = this.userData.profile;
      this.profileForm.patchValue({
        companyName: profile.companyName || '',
        industry: profile.industry || '',
        companySize: profile.companySize || '1-10',
        description: profile.description || '',
        location: {
          country: profile.location?.country || '',
          city: profile.location?.city || '',
          address: profile.location?.address || '',
        },
        contactEmail: profile.contactEmail || '',
        contactPhone: profile.contactPhone || '',
        website: profile.website || '',
        preferredSkills: profile.preferredSkills
          ? profile.preferredSkills.join(', ')
          : '',
      });
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.profileForm.controls).forEach((key) => {
        const control = this.profileForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    const formData = this.processFormData();

    if (this.userService.getUserRole() === 'talent') {
      this.userService.updateTalentProfile(formData).subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Profile updated successfully!';
          // Navigate back to profile after a short delay
          setTimeout(() => this.router.navigate(['/profile']), 1500);
        },
        error: (err) => {
          console.error('Error updating profile:', err);
          this.error = 'Failed to update profile. Please try again.';
          this.loading = false;
        },
      });
    } else {
      this.userService.updateClientProfile(formData).subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Company profile updated successfully!';
          // Navigate back to profile after a short delay
          setTimeout(() => this.router.navigate(['/profile']), 1500);
        },
        error: (err) => {
          console.error('Error updating profile:', err);
          this.error = 'Failed to update profile. Please try again.';
          this.loading = false;
        },
      });
    }
  }

  processFormData(): any {
    const formData = { ...this.profileForm.value };

    // Process skills for talent profile
    if (
      this.userService.getUserRole() === 'talent' &&
      typeof formData.skills === 'string'
    ) {
      formData.skills = formData.skills
        .split(',')
        .map((skill: string) => skill.trim())
        .filter((skill: string) => skill.length > 0);
    }

    // Process preferred skills for client profile
    if (
      this.userService.getUserRole() === 'client' &&
      typeof formData.preferredSkills === 'string'
    ) {
      formData.preferredSkills = formData.preferredSkills
        .split(',')
        .map((skill: string) => skill.trim())
        .filter((skill: string) => skill.length > 0);
    }

    return formData;
  }

  cancelEdit(): void {
    this.router.navigate(['/profile']);
  }
  get userSvc(): UserService {
    return this.userService;
  }
}
