import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TermsService {
  private readonly acceptedKey = 'tos_accepted_v1';
  private readonly redirectKey = 'tos_redirect_url';

  isAccepted(): boolean {
    return localStorage.getItem(this.acceptedKey) === 'true';
  }

  accept(): void {
    localStorage.setItem(this.acceptedKey, 'true');
  }

  setRedirectUrl(url: string): void {
    if (!url) {
      return;
    }
    localStorage.setItem(this.redirectKey, url);
  }

  consumeRedirectUrl(): string | null {
    const url = localStorage.getItem(this.redirectKey);
    localStorage.removeItem(this.redirectKey);
    return url;
  }
}
