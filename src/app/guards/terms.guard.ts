import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { TermsService } from '../services/terms.service';

@Injectable({ providedIn: 'root' })
export class TermsGuard implements CanActivate {
  constructor(private termsService: TermsService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.termsService.isAccepted()) {
      return true;
    }
    if (state.url && state.url !== '/terms') {
      this.termsService.setRedirectUrl(state.url);
    }
    this.router.navigate(['/terms']);
    return false;
  }
}
