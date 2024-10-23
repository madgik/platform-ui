import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { appRoutes } from './app/app.routes'; // Import your routes

import { AppComponent } from './app/app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'; // Root component
import { provideHttpClient } from '@angular/common/http'; // Import provideHttpClient

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes, withHashLocation()), // Use hash-based routing
    provideAnimationsAsync(),  // Animations if needed
    provideHttpClient()        // Ensure HttpClient is provided globally
  ]
}).catch(err => console.error(err));
