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
    return this.http.get<User>('/services/activeUser').pipe(
      tap((user) => {
        this.authStateSubject.next({ status: 'authenticated', user });
        this.consumeRedirect();
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

  login(redirectUrl: string = '/'): void {
    const target = redirectUrl || '/';
    localStorage.setItem(this.redirectUrlKey, target);

    const normalizedTarget = target.startsWith('/') ? target : `/${target}`;

    const encodedTarget = encodeURIComponent(normalizedTarget);
    window.location.href = `/services/oauth2/authorization/keycloak?frontend_redirect=${encodedTarget}`;
  }

  logout(): void {
    this.http.post('/services/logout', {}).pipe(
      catchError((error) => {
        console.error('Error during backend logout:', error);
        return of(null);
      })
    ).subscribe(() => {
      localStorage.removeItem(this.redirectUrlKey);
      this.authStateSubject.next({ status: 'unauthenticated' });
      this.router.navigate(['/']).then(() => window.location.reload());
    });
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
    const redirectUrl = localStorage.getItem(this.redirectUrlKey);
    if (!redirectUrl) {
      return;
    }

    localStorage.removeItem(this.redirectUrlKey);
    this.router.navigateByUrl(redirectUrl).catch((error) => {
      console.error('Navigation to stored redirect failed:', error);
    });
  }
}
