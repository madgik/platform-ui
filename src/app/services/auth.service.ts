import { inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap, filter } from 'rxjs/operators';
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
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly redirectUrlKey = 'redirect_url';

  private readonly authStateSignal = signal<AuthState>({ status: 'checking' });
  readonly authState = this.authStateSignal.asReadonly();
  readonly authState$ = toObservable(this.authState);

  private initialized = false;
  private hasRedirectedAfterLogin = false;

  constructor() { }

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.refreshAuthState().subscribe();
  }

  refreshAuthState(): Observable<User | null> {
    this.authStateSignal.set({ status: 'checking' });
    return this.refreshUser();
  }

  private refreshUser(): Observable<User | null> {
    const wasAuthenticated = this.isLoggedIn();

    return this.http.get<User>('/services/activeUser').pipe(
      tap((user) => {
        this.authStateSignal.set({ status: 'authenticated', user });
        if (!wasAuthenticated && !this.hasRedirectedAfterLogin) {
          this.hasRedirectedAfterLogin = true;
          this.consumeRedirect();
        }
      }),
      catchError((error) => {
        if (error.status !== 401 && error.status !== 403) {
          console.error('Error fetching active user:', error);
        }
        // Changed from this.authStateSubject.next to this.authStateSignal.set
        this.authStateSignal.set({ status: 'unauthenticated' });
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
    this.authStateSignal.set({ status: 'unauthenticated' });

    // Use a full-page redirect so the backend/IdP can clear SSO cookies.
    window.location.href = '/services/logout';
  }

  isLoggedIn(): boolean {
    return this.authState().status === 'authenticated';
  }

  get currentUser(): User | null {
    return this.authState().user ?? null;
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
