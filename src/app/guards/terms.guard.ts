import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { TermsService } from '../services/terms.service';

@Injectable({ providedIn: 'root' })
export class TermsGuard implements CanActivate {
  constructor(
    private termsService: TermsService,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.authService.onAuthResolved().pipe(
      take(1),
      map((authState) => {
        if (this.termsService.hasAgreed(authState.user)) {
          return true;
        }
        if (state.url && state.url !== '/terms') {
          this.termsService.setRedirectUrl(state.url);
        }
        this.router.navigate(['/terms']);
        return false;
      })
    );
  }
}
