import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideAuth0 } from '@auth0/auth0-angular';

bootstrapApplication(AppComponent, {
  providers: [
    provideAuth0({
      domain: 'dev-zxuicoohweme0r55.us.auth0.com',
      clientId: 'WjTquwIaQfnpUeQ6N081RnkLJMihekqO',
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    }),
  ],
});
