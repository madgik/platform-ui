import { Component, OnInit } from '@angular/core';
import {Router, NavigationEnd, RouterOutlet} from '@angular/router';
import { FederationService } from '../../services/federation.service';
import { AuthService } from '../../services/auth.service';
import { Federation } from '../../interfaces/federations.interface';
import { filter } from 'rxjs';
import {FilterComponent} from "./filter/filter.component";
import {FederationCardComponent} from "./federation-card/federation-card.component";
import {NgForOf, NgIf} from "@angular/common";
import {AddFederationCardComponent} from "./add-federation-card/add-federation-card.component";

@Component({
  selector: 'app-federations',
  templateUrl: './federations-page.component.html',
  styleUrls: ['./federations-page.component.css'],
  imports: [
    FilterComponent,
    RouterOutlet,
    FederationCardComponent,
    NgForOf,
    AddFederationCardComponent,
    NgIf
  ],
  standalone: true
})
export class FederationsPageComponent implements OnInit {
  filters = ['All', 'Public', 'Accessed', 'Request Access', 'Pathology'];
  selectedFilter = 'All';
  federations: Federation[] = [];
  filteredFederations: Federation[] = [];
  isAdmin = false;

  constructor(
    private federationService: FederationService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadFederations();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url === '/federations') {
          this.loadFederations();
        }
      });

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
    this.router.navigate(['/federations/update'], {queryParams: {federationCode}}).then(() => null);
   }

  goToVisualization(federationCode: string): void {
    this.router.navigate(['/data-models'], {queryParams: {federationCode}}).then(() => null);
   }

  deleteFederation(federationCode: string): void {
    if (confirm('Are you sure you want to delete this federation?')) {
      this.federationService.deleteFederation(federationCode).subscribe({
        next: () => this.loadFederations(),
        error: (error) => console.error(`Error deleting federation:`, error),
      });
    }
  }

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
    this.filteredFederations = this.federations;
  }

  // Check if the current route is a child route
  isChildRouteActive(): boolean {
    const currentPath = this.router.url;
    return currentPath.includes('/federations/add') || currentPath.includes('/federations/update');
  }
}
