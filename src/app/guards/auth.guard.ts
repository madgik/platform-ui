import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, map, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // wait for intitialisationt to finish
    return this.authService.authState$.pipe(
      filter((authState) => authState.status !== 'checking'),
      take(1),
      tap((authState) => {
        console.log('AuthGuard state:', authState.status);
        if (authState.status !== 'authenticated') {
          this.authService.login(state.url); // redirect to keycloak
        }
      }),
      map((authState) => authState.status === 'authenticated')
    );
  }
}

