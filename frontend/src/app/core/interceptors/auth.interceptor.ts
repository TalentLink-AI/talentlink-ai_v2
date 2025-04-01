import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { AuthService } from '@auth0/auth0-angular';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Don't add token for public endpoints
    if (request.url.includes('/public/')) {
      return next.handle(request);
    }

    return this.auth.getAccessTokenSilently().pipe(
      catchError((error) => {
        // Handle authentication errors
        console.error('Auth token error:', error);
        this.router.navigate(['/home']);
        return throwError(() => new Error('Authentication required'));
      }),
      mergeMap((token) => {
        // Clone the request and add the token
        const authReq = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Handle the response including token expiration
        return next.handle(authReq).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
              // Token expired or invalid
              this.auth.logout({
                logoutParams: {
                  returnTo: window.location.origin,
                },
              });
            }
            return throwError(() => error);
          })
        );
      })
    );
  }
}
