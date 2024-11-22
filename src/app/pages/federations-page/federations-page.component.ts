import { Component, OnInit } from '@angular/core';
import {Router, RouterLink, RouterOutlet, NavigationEnd} from '@angular/router';
import { FederationService } from '../../services/federation.service';
import { AuthService } from '../../services/auth.service';
import { Federation } from '../../interfaces/federations.interface';
import {CommonModule} from "@angular/common";
import {filter} from "rxjs";

@Component({
  selector: 'app-federations',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './federations-page.component.html',
  styleUrls: ['./federations-page.component.css'],
})
export class FederationsPageComponent implements OnInit {
  filters = ['All', 'Public', 'Accessed', 'Request Access', 'Pathology']; // Define filter options
  selectedFilter = 'All'; // Default filter selection
  federations: Federation[] = []; // Federations data from the service
  filteredFederations: Federation[] = []; // To store filtered federations
  isAdmin = false;

  constructor(
    private federationService: FederationService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadFederations();

    // Listen for navigation events to reload federations
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        if (url === '/federations') {
          this.loadFederations(); // Reload federations when returning to the federations list
        }
      });

    // Subscribe to role check
    this.authService.hasRole('DC_ADMIN').subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });
  }

  loadFederations(): void {
    this.federationService.getFederationsWithModels().subscribe({
      next: (federations) => {
        this.federations = federations;
        this.filteredFederations = federations;
      },
      error: (error) => console.error('Error loading federations:', error),
    });
  }

  goToAddFederation(): void {
    this.router.navigate(['/federations/add']);
  }

  goToUpdateFederation(federationCode: string): void {
    this.router.navigate(['/federations/update'], {
      queryParams: { federationCode },
    });
  }


  goToVisualization(federationCode: string) {
    this.router.navigate(['/data-models'], {
      queryParams: { federationCode },
    });
  }

  deleteFederation(federationCode: string): void {
    if (confirm('Are you sure you want to delete this federation?')) {
      this.federationService.deleteFederation(federationCode).subscribe({
        next: () => {
          console.log(`Federation ${federationCode} deleted successfully.`);
          this.loadFederations(); // Reload federations after successful deletion
        },
        error: (error) => {
          console.error(`Error deleting federation ${federationCode}:`, error);
        },
      });
    }
  }


  selectFilter(filter: string) {
    this.selectedFilter = filter;
    this.filteredFederations = this.federations;
    // TODO: Add logic to filter federations based on the selected filter
  }

  // Check if the current route is a child route
  isChildRouteActive(): boolean {
    const currentPath = this.router.url;
    return currentPath.includes('/federations/add') || currentPath.includes('/federations/update');
  }
}
