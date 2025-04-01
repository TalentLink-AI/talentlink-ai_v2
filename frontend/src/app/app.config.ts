import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
//import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAuth0 } from '@auth0/auth0-angular';
import { environment } from '../environments/environment';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideClientHydration(),
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: 'https://api.talentlink.com',
        scope: 'openid profile email read:roles',
      },
    }),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    // importProvidersFrom(
    //   LoggerModule.forRoot({
    //     level: environment.production
    //       ? NgxLoggerLevel.WARN
    //       : NgxLoggerLevel.DEBUG,
    //     serverLogLevel: environment.production
    //       ? NgxLoggerLevel.ERROR
    //       : NgxLoggerLevel.DEBUG,
    //     // Optionally, set the serverLoggingUrl if you have a backend endpoint for logs:
    //     // serverLoggingUrl: 'https://your-backend/logs'
    //   })
    // ),
  ],
};
