// frontend/src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Base user interface
export interface UserData {
  _id: string;
  auth0Id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'talent' | 'client' | 'admin';
  profilePicture: string;
  isActive: boolean;
  metadata: {
    lastLogin: string;
    onboardingCompleted: boolean;
    onboardingStep:
      | 'initial'
      | 'basic-info'
      | 'profile-type'
      | 'profile-details'
      | 'completed';
  };
  createdAt: string;
  updatedAt: string;
}

// Talent Profile Interface
export interface TalentProfile {
  _id: string;
  userId: string;
  title: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  availability: 'full-time' | 'part-time' | 'contract' | 'freelance';
  location: {
    country: string;
    city: string;
    remote: boolean;
  };
  education?: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate?: string;
    current: boolean;
  }>;
  experience?: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
  }>;
  portfolio?: Array<{
    title: string;
    description: string;
    url: string;
    imageUrl?: string;
    technologies: string[];
  }>;
  website?: string;
  linkedin?: string;
  github?: string;
  avgRating: number;
  numReviews: number;
  completedJobs: number;
  createdAt: string;
  updatedAt: string;
}

// Client Profile Interface
export interface ClientProfile {
  _id: string;
  userId: string;
  companyName: string;
  industry: string;
  companySize: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  description: string;
  website?: string;
  location: {
    country: string;
    city: string;
    address?: string;
  };
  contactEmail: string;
  contactPhone?: string;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  logo?: string;
  jobsPosted: number;
  talentsHired: number;
  avgRating: number;
  numReviews: number;
  preferredSkills?: string[];
  preferredRates?: {
    min: number;
    max?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Combined user data with profile
export interface UserData {
  user: UserData;
  profile: TalentProfile | ClientProfile | null;
  needsOnboarding: boolean;
  currentOnboardingStep: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/users`;
  private userDataSubject = new BehaviorSubject<UserData | null>(null);

  // Observable that components can subscribe to
  public userData$ = this.userDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get current user data including appropriate profile
  getCurrentUser(): Observable<UserData> {
    return this.http.get<UserData>(`${this.apiUrl}/me`).pipe(
      tap((userData) => {
        this.userDataSubject.next(userData);
      })
    );
  }

  // Update basic user info
  updateUserInfo(userInfo: Partial<UserData>): Observable<UserData> {
    return this.http.put<UserData>(`${this.apiUrl}/me`, userInfo).pipe(
      tap((userData) => {
        this.userDataSubject.next(userData);
      })
    );
  }

  // Set user role (talent or client)
  setUserRole(role: 'talent' | 'client'): Observable<UserData> {
    return this.http.post<UserData>(`${this.apiUrl}/role`, { role }).pipe(
      tap((userData) => {
        this.userDataSubject.next(userData);
      })
    );
  }

  // Update talent profile
  updateTalentProfile(
    profileData: Partial<TalentProfile>
  ): Observable<UserData> {
    return this.http
      .post<UserData>(`${this.apiUrl}/profile/talent`, profileData)
      .pipe(
        tap((userData) => {
          this.userDataSubject.next(userData);
        })
      );
  }

  // Update client profile
  updateClientProfile(
    profileData: Partial<ClientProfile>
  ): Observable<UserData> {
    return this.http
      .post<UserData>(`${this.apiUrl}/profile/client`, profileData)
      .pipe(
        tap((userData) => {
          this.userDataSubject.next(userData);
        })
      );
  }

  // Update onboarding step
  updateOnboardingStep(
    step: UserData['metadata']['onboardingStep']
  ): Observable<UserData> {
    return this.http
      .put<UserData>(`${this.apiUrl}/onboarding-step`, { step })
      .pipe(
        tap((userData) => {
          this.userDataSubject.next(userData);
        })
      );
  }

  // Complete onboarding
  completeOnboarding(): Observable<UserData> {
    return this.updateOnboardingStep('completed');
  }

  // Helper methods
  getUserRole(): string | null {
    const userData = this.userDataSubject.getValue();
    return userData ? userData.user.role : null;
  }

  getNeedsOnboarding(): boolean {
    const userData = this.userDataSubject.getValue();
    return userData ? userData.needsOnboarding : true;
  }

  getCurrentOnboardingStep(): string {
    const userData = this.userDataSubject.getValue();
    return userData ? userData.currentOnboardingStep : 'initial';
  }

  // Get current profile based on user role
  getCurrentProfile(): TalentProfile | ClientProfile | null {
    const userData = this.userDataSubject.getValue();
    return userData ? userData.profile : null;
  }

  // Type guard for talent profile
  isTalentProfile(profile: any): profile is TalentProfile {
    return profile && 'hourlyRate' in profile;
  }

  // Type guard for client profile
  isClientProfile(profile: any): profile is ClientProfile {
    return profile && 'companyName' in profile;
  }
  getTalentProfileForEdit(): Observable<TalentProfile> {
    const userData = this.userDataSubject.getValue();
    if (!userData || !userData.profile || userData.user.role !== 'talent') {
      return throwError(() => new Error('No talent profile found'));
    }
    return of(userData.profile as TalentProfile);
  }

  /**
   * Get client profile for editing
   */
  getClientProfileForEdit(): Observable<ClientProfile> {
    const userData = this.userDataSubject.getValue();
    if (!userData || !userData.profile || userData.user.role !== 'client') {
      return throwError(() => new Error('No client profile found'));
    }
    return of(userData.profile as ClientProfile);
  }

  /**
   * Update talent profile with education
   */
  addEducation(educationData: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate?: string;
    current: boolean;
  }): Observable<UserData> {
    const userData = this.userDataSubject.getValue();
    if (!userData || !userData.profile || userData.user.role !== 'talent') {
      return throwError(() => new Error('No talent profile found'));
    }

    const profile = userData.profile as TalentProfile;
    const education = [...(profile.education || []), educationData];

    return this.updateTalentProfile({ education });
  }

  /**
   * Update talent profile with experience
   */
  addExperience(experienceData: {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
  }): Observable<UserData> {
    const userData = this.userDataSubject.getValue();
    if (!userData || !userData.profile || userData.user.role !== 'talent') {
      return throwError(() => new Error('No talent profile found'));
    }

    const profile = userData.profile as TalentProfile;
    const experience = [...(profile.experience || []), experienceData];

    return this.updateTalentProfile({ experience });
  }

  /**
   * Update talent profile with portfolio project
   */
  addPortfolioItem(portfolioData: {
    title: string;
    description: string;
    url: string;
    imageUrl?: string;
    technologies: string[];
  }): Observable<UserData> {
    const userData = this.userDataSubject.getValue();
    if (!userData || !userData.profile || userData.user.role !== 'talent') {
      return throwError(() => new Error('No talent profile found'));
    }

    const profile = userData.profile as TalentProfile;
    const portfolio = [...(profile.portfolio || []), portfolioData];

    return this.updateTalentProfile({ portfolio });
  }

  /**
   * Remove an education item by index
   */
  removeEducation(index: number): Observable<UserData> {
    const userData = this.userDataSubject.getValue();
    if (!userData || !userData.profile || userData.user.role !== 'talent') {
      return throwError(() => new Error('No talent profile found'));
    }

    const profile = userData.profile as TalentProfile;
    if (!profile.education || profile.education.length <= index) {
      return throwError(() => new Error('Education item not found'));
    }

    const education = [...profile.education];
    education.splice(index, 1);

    return this.updateTalentProfile({ education });
  }

  /**
   * Remove an experience item by index
   */
  removeExperience(index: number): Observable<UserData> {
    const userData = this.userDataSubject.getValue();
    if (!userData || !userData.profile || userData.user.role !== 'talent') {
      return throwError(() => new Error('No talent profile found'));
    }

    const profile = userData.profile as TalentProfile;
    if (!profile.experience || profile.experience.length <= index) {
      return throwError(() => new Error('Experience item not found'));
    }

    const experience = [...profile.experience];
    experience.splice(index, 1);

    return this.updateTalentProfile({ experience });
  }

  /**
   * Remove a portfolio item by index
   */
  removePortfolioItem(index: number): Observable<UserData> {
    const userData = this.userDataSubject.getValue();
    if (!userData || !userData.profile || userData.user.role !== 'talent') {
      return throwError(() => new Error('No talent profile found'));
    }

    const profile = userData.profile as TalentProfile;
    if (!profile.portfolio || profile.portfolio.length <= index) {
      return throwError(() => new Error('Portfolio item not found'));
    }

    const portfolio = [...profile.portfolio];
    portfolio.splice(index, 1);

    return this.updateTalentProfile({ portfolio });
  }
}
