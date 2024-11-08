import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import {map} from "rxjs/operators";
import {UserService} from "./user.service";
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private redirectUrlKey = 'redirect_url';

  // Observable to track login state
  private loggedInSubject = new BehaviorSubject<boolean>(this.hasToken());

  constructor(private http: HttpClient, private userService: UserService, private router: Router) {}

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  // Initiate login by saving intended URL
  login(redirectUrl: string = '/') {
    // Save the intended URL to local storage
    localStorage.setItem(this.redirectUrlKey, redirectUrl);

    // Redirect to backend login
    window.location.href = '/services/oauth2/authorization/keycloak';
  }

  // After login, handle callback and redirect to intended URL
  handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem(this.tokenKey, token);

      // Update the logged-in state
      this.loggedInSubject.next(true);

      // Retrieve the stored URL or default to home
      const redirectUrl = localStorage.getItem(this.redirectUrlKey);

      // Clear the stored URL and navigate
      localStorage.removeItem(this.redirectUrlKey);
      this.router.navigate([redirectUrl]);
    } else {
      console.error('No token found in callback URL');
    }
  }

  logout() {
    // Call the backend logout endpoint to invalidate the session
    this.http.post('/services/logout', {}).subscribe({
      next: () => {
        // On successful logout from backend, clear local data
        localStorage.removeItem(this.tokenKey);
        this.loggedInSubject.next(false);
        localStorage.removeItem(this.redirectUrlKey);

        // Navigate to home and reload to ensure the app is fully reset
        this.router.navigate(['/']).then(() => {
          window.location.reload();
        });
      },
      error: (err: any) => {
        console.error('Error during backend logout:', err);

        // Fallback: clear local data and reload even if backend logout fails
        localStorage.removeItem(this.tokenKey);
        this.loggedInSubject.next(false);
        localStorage.removeItem(this.redirectUrlKey);
        this.router.navigate(['/']).then(() => {
          window.location.reload();
        });
      }
    });
  }

  isLoggedIn(): boolean {
    return this.loggedInSubject.value;
  }

  // Check if the user has a specific role
  hasRole(role: string): Observable<boolean> {
    return this.userService.getUserRoles().pipe(
      map((roles) => roles.includes(role))
    );
  }
}
