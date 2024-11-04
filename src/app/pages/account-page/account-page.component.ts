import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from "../../services/auth.service";
import { UserService } from "../../services/user.service";
import {User} from "../../interfaces/user.interface";

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './account-page.component.html',
  styleUrls: ['./account-page.component.css']
})
export class AccountPageComponent implements OnInit {
  userName = '';
  userEmail = '';

  constructor(
    public authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadUserDetails();
  }

  loadUserDetails(): void {
    this.userService.getUserDetails().subscribe({
      next: (user: User) => {
        this.userName = user.fullname;
        this.userEmail = user.email;
      },
      error: (error) => {
        console.error("Error loading user details:", error);
      }
    });
  }

  signOut(): void {
    this.authService.logout();
  }
}
