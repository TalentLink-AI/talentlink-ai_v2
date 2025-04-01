// src/app/core/services/csrf.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators'; // Import the map operator

@Injectable({
  providedIn: 'root',
})
export class CsrfService {
  private csrfToken: string | null = null;

  constructor(private http: HttpClient) {}

  getToken(): Observable<string> {
    if (this.csrfToken) {
      return of(this.csrfToken as string);
    }

    return this.http.get<{ csrfToken: string }>('/api/csrf-token').pipe(
      tap((response) => {
        this.csrfToken = response.csrfToken;
      }),
      map((response: { csrfToken: string }) => response.csrfToken)
    );
  }
}
