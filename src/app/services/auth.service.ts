import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private redirectUrlKey = 'redirect_url';

  constructor(private router: Router) {}

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
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.redirectUrlKey); // Optional: Clear redirect URL on logout
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}
