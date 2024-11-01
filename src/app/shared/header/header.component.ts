import { CommonModule, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { RouterModule } from '@angular/router';
import {AuthService} from "../../services/auth.service";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NavbarComponent, NgIf, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  constructor(public authService: AuthService) {}

  isLoggedIn = false;  // Simulate login state
  userPicture = 'assets/user-avatar.jpg';  // Placeholder user picture
  login(): void {
    this.authService.login();
  }

  logout(): void {
    this.authService.logout();
  }
}
