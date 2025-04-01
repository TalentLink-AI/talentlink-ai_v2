// user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UserProfile {
  auth0Id: string;
  email: string;
  profile: {
    name: string;
    picture: string;
    title?: string;
    bio?: string;
    location?: string;
    skills?: string[];
    phoneNumber?: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };
  metadata: {
    lastLogin: string;
    onboardingCompleted: boolean;
    onboardingStep:
      | 'initial'
      | 'basic-info'
      | 'skills'
      | 'preferences'
      | 'completed';
  };
  roles: string[];
  projects: string[];
  createdAt: string;
  updatedAt: string;
  needsOnboarding: boolean;
  currentOnboardingStep: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/users`;
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);

  // Observable that components can subscribe to
  public userProfile$ = this.userProfileSubject.asObservable();

  constructor(private http: HttpClient) {}

  getCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`).pipe(
      tap((profile) => {
        this.userProfileSubject.next(profile);
      })
    );
  }

  updateProfile(
    profile: Partial<UserProfile['profile']>
  ): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me`, { profile }).pipe(
      tap((updatedProfile) => {
        this.userProfileSubject.next(updatedProfile);
      })
    );
  }

  updateOnboardingStep(
    step: UserProfile['metadata']['onboardingStep'],
    profileData?: Partial<UserProfile['profile']>
  ): Observable<UserProfile> {
    return this.http
      .put<UserProfile>(`${this.apiUrl}/me/onboarding`, {
        step,
        profileData,
      })
      .pipe(
        tap((updatedProfile) => {
          this.userProfileSubject.next(updatedProfile);
        })
      );
  }

  completeOnboarding(): Observable<UserProfile> {
    return this.updateOnboardingStep('completed');
  }

  checkNeedsOnboarding(): boolean {
    const profile = this.userProfileSubject.getValue();
    return profile ? profile.needsOnboarding : true;
  }

  getCurrentOnboardingStep(): string {
    const profile = this.userProfileSubject.getValue();
    return profile ? profile.currentOnboardingStep : 'initial';
  }
}
