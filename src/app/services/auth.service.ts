import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private redirectUrlKey = 'redirect_url';

  // Observable to track login state
  private loggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$: Observable<boolean> = this.loggedInSubject.asObservable();

  constructor(private router: Router) {}

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
      const redirectUrl = localStorage.getItem(this.redirectUrlKey) || '/protected';

      // Clear the stored URL and navigate
      localStorage.removeItem(this.redirectUrlKey);
      this.router.navigate([redirectUrl]);
    } else {
      console.error('No token found in callback URL');
    }
  }

  logout() {
    // Clear token and reset login state
    localStorage.removeItem(this.tokenKey);
    this.loggedInSubject.next(false); // Update to logged-out state
    localStorage.removeItem(this.redirectUrlKey);

    // Navigate to the home page or login page and reload the application
    this.router.navigate(['/']).then(() => {
      window.location.reload(); // Ensure app fully resets after logout
    });
  }

  isLoggedIn(): boolean {
    return this.loggedInSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}
