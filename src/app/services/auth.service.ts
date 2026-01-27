import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, filter, map, tap } from 'rxjs/operators';
import { User } from '../models/user.interface';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  user?: User | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly redirectUrlKey = 'redirect_url';

  private readonly authStateSubject = new BehaviorSubject<AuthState>({ status: 'checking' });
  readonly authState$ = this.authStateSubject.asObservable();
  readonly isAuthenticated$ = this.authState$.pipe(map((state) => state.status === 'authenticated'));

  private initialized = false;
  private hasRedirectedAfterLogin = false;

  constructor(private http: HttpClient, private router: Router) {}

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.refreshAuthState();
  }

  refreshAuthState(): void {
    this.authStateSubject.next({ status: 'checking' });
    this.refreshUser().subscribe();
  }

  private refreshUser(): Observable<User | null> {
    const wasAuthenticated = this.isLoggedIn();

    return this.http.get<User>('/services/activeUser').pipe(
      tap((user) => {
        this.authStateSubject.next({ status: 'authenticated', user });
        if (!wasAuthenticated && !this.hasRedirectedAfterLogin) {
          this.hasRedirectedAfterLogin = true;
          this.consumeRedirect();
        }
      }),
      catchError((error) => {
        if (error.status !== 401 && error.status !== 403) {
          console.error('Error fetching active user:', error);
        }
        this.authStateSubject.next({ status: 'unauthenticated' });
        return of(null);
      })
    );
  }

  login(redirectUrl: string = '/experiments-dashboard'): void {
    const target = redirectUrl.startsWith('http')
      ? redirectUrl
      : `${window.location.origin}${redirectUrl.startsWith('/') ? '' : '/'}${redirectUrl}`;
    localStorage.setItem(this.redirectUrlKey, target);
    const encodedTarget = encodeURIComponent(target);
    window.location.href = `/services/oauth2/authorization/keycloak?frontend_redirect=${encodedTarget}`;
  }

  logout(): void {
    localStorage.removeItem(this.redirectUrlKey);
    this.authStateSubject.next({ status: 'unauthenticated' });

    // Use a full-page redirect so the backend/IdP can clear SSO cookies.
    window.location.href = '/services/logout';
  }

  isLoggedIn(): boolean {
    return this.authStateSubject.value.status === 'authenticated';
  }

  get currentUser(): User | null {
    return this.authStateSubject.value.user ?? null;
  }

  onAuthResolved(): Observable<AuthState> {
    return this.authState$.pipe(filter((state) => state.status !== 'checking'));
  }

  private consumeRedirect(): void {
    const stored = localStorage.getItem(this.redirectUrlKey);
    if (!stored) {
      return;
    }

    localStorage.removeItem(this.redirectUrlKey);

    if (stored.startsWith('http')) {
      window.location.href = stored;
      return;
    }

    this.router.navigateByUrl(stored).catch((error) => {
      console.error('Navigation to stored redirect failed:', error);
      // hard fallback: force location change
      window.location.href = stored;
    });
  }

  private clearRedirectFlag(): void {
    localStorage.removeItem(this.redirectUrlKey);
  }
}
