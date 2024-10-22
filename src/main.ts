import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { appRoutes } from './app/app.routes'; // Import your routes

import { AppComponent } from './app/app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'; // Root component

bootstrapApplication(AppComponent, {
  providers: [provideRouter(appRoutes, withHashLocation()), provideAnimationsAsync()] // Use hash-based routing
}).catch(err => console.error(err));
