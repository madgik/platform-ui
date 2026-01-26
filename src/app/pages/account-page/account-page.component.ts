import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from "../../services/auth.service";
import { User } from '../../models/user.interface';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './account-page.component.html',
  styleUrls: ['./account-page.component.css']
})
export class AccountPageComponent implements OnInit, OnDestroy {
  userName = '';
  userEmail = '';

  private destroy$ = new Subject<void>();

  constructor(
    public authService: AuthService,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.authService.authState$
      .pipe(
        filter((state) => state.status === 'authenticated'),
        takeUntil(this.destroy$)
      )
      .subscribe((state) => {
        const user: User | null = state.user ?? null;
        if (user) {
          this.userName = user.fullname ?? '';
          this.userEmail = user.email ?? '';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  signOut(): void {
    this.authService.logout();
  }

  goBack(): void {
    this.location.back();
  }
}
