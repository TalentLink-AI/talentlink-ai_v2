import { Injectable } from '@angular/core';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, concatMap, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class CustomAuthService {
  private userProfileSubject = new BehaviorSubject<User | null>(null);
  userProfile$ = this.userProfileSubject.asObservable();

  constructor(private auth0: Auth0Service, private http: HttpClient) {
    // Subscribe to Auth0 user changes
    this.auth0.user$.subscribe((auth0User) => {
      if (auth0User) {
        this.upsertUserProfile(auth0User);
      } else {
        this.userProfileSubject.next(null);
      }
    });
  }

  // Login with Auth0
  login(): void {
    this.auth0.loginWithRedirect();
  }

  // Logout from Auth0
  logout(): void {
    this.auth0.logout({
      logoutParams: { returnTo: window.location.origin },
    });
  }

  // Get authentication state
  isAuthenticated(): Observable<boolean> {
    return this.auth0.isAuthenticated$;
  }

  // Get access token for API calls
  getAccessToken(): Observable<string> {
    return this.auth0.getAccessTokenSilently();
  }

  // Sync user profile with backend after login
  private upsertUserProfile(auth0User: any): void {
    const profileData = {
      firstName: auth0User.given_name || auth0User.name?.split(' ')[0] || '',
      lastName:
        auth0User.family_name ||
        auth0User.name?.split(' ').slice(1).join(' ') ||
        '',
      profilePicture: auth0User.picture || '',
    };

    this.http
      .post<{ user: User }>(`${environment.apiUrl}/users/profile`, profileData)
      .pipe(
        catchError((error) => {
          console.error('Error syncing user profile', error);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response && response.user) {
          this.userProfileSubject.next(response.user);
        }
      });
  }

  // Get user profile from backend
  getUserProfile(): Observable<User | null> {
    return this.http.get<{ user: User }>(`${environment.apiUrl}/users/me`).pipe(
      map((response) => response.user),
      tap((user) => this.userProfileSubject.next(user)),
      catchError((error) => {
        console.error('Error fetching user profile', error);
        return of(null);
      })
    );
  }

  // Update user profile
  updateUserProfile(profileData: Partial<User>): Observable<User | null> {
    return this.http
      .put<{ user: User }>(`${environment.apiUrl}/users/profile`, profileData)
      .pipe(
        map((response) => response.user),
        tap((user) => this.userProfileSubject.next(user)),
        catchError((error) => {
          console.error('Error updating user profile', error);
          return of(null);
        })
      );
  }
}
