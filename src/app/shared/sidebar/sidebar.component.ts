import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

interface SidebarItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() items!: any[];
  @Input() title!: string;
  isCollapsed = false;  // Property to toggle sidebar state

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}
