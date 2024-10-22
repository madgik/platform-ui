import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './account-page.component.html',
  styleUrls: ['./account-page.component.css']
})

export class AccountPageComponent {
  isCollapsed = false;  // Control sidebar state
  userName = 'Molly Katsouli';
  userEmail = 'katsouli.mo@gmail.com';

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  signOut() {
    console.log('Sign out logic goes here...');
  }
}
