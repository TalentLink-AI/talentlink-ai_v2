// user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  auth0Id: string;
  email: string;
  profile: {
    name: string;
    picture: string;
  };
  metadata: {
    lastLogin: string;
  };
  roles: string[];
  projects: string[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/users`;

  constructor(private http: HttpClient) {}

  getCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`);
  }

  updateProfile(
    profile: Partial<UserProfile['profile']>
  ): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me`, { profile });
  }
}
