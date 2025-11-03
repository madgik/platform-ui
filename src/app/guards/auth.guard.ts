// import { Injectable } from '@angular/core';
// import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
// import { AuthService } from '../services/auth.service';
// import { Observable, of } from 'rxjs';
// import { filter, map, take, tap } from 'rxjs/operators';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthGuard implements CanActivate {

//   constructor(private authService: AuthService) {}

//   canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
//     if (this.authService.isLoggedIn()) {
//       return of(true);
//     }

//     return this.authService.authState$.pipe(
//       filter((authState) => authState.status !== 'checking'),
//       take(1),
//       tap((authState) => {
//         if (authState.status !== 'authenticated') {
//           this.authService.login(state.url);
//         }
//       }),
//       map((authState) => authState.status === 'authenticated')
//     );
//   }
// }

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, map, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // Περιμένουμε να ολοκληρωθεί η αρχικοποίηση (όχι άλλο initialize)
    return this.authService.authState$.pipe(
      filter((authState) => authState.status !== 'checking'), // περιμένουμε να σταματήσει το "checking"
      take(1),
      tap((authState) => {
        console.log('AuthGuard state:', authState.status);
        if (authState.status !== 'authenticated') {
          this.authService.login(state.url); // redirect στον keycloak
        }
      }),
      map((authState) => authState.status === 'authenticated')
    );
  }
}

