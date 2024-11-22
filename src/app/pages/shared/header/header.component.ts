import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';
import {NavigationEnd, Router, RouterModule} from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import {Component, OnInit} from "@angular/core";
import {filter} from "rxjs";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  currentRoute: string | undefined;
  constructor(private router: Router, public authService: AuthService) {}

  ngOnInit(): void {
    // Listen to changes in the route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects; // Update to the latest route
        console.log("Updated current route:", this.currentRoute);
      });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  login(): void {
    this.authService.login(this.currentRoute);
  }

  logout(): void {
    this.authService.logout();
  }
}
