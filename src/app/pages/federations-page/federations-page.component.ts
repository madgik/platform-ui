import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FederationService } from '../../services/federation.service';
import {Federation} from "../../interfaces/federations.interface";
import {Router, RouterLink} from "@angular/router";
import {AuthService} from "../../services/auth.service";

@Component({
  selector: 'app-federations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './federations-page.component.html',
  styleUrls: ['./federations-page.component.css']
})
export class FederationsPageComponent implements OnInit {
  filters = ['All', 'Public', 'Accessed', 'Request Access', 'Pathology'];  // Define filter options
  selectedFilter = 'All';  // Default filter selection

  federations: Federation[] = [];  // Federations data from the service
  filteredFederations: Federation[] = [];  // To store filtered federations
  isAdmin = false;

  constructor(private federationService: FederationService, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.federationService.getFederationsWithFullDataModelNames().subscribe({
      next: (federations) => {
        this.federations = federations;
        this.filteredFederations = federations;  // If you use a filtered list
      },
      error: (error) => console.error('Error loading federations:', error)
    });

    // Subscribe to role check
    this.authService.hasRole('DC_ADMIN').subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
  }

  goToAddFederationPage() {
    console.log('Navigating to Add Federation page');
    this.router.navigate(['/add-federation']);
  }

  // Method to navigate to the /visualization route with a specified federation
  goToVisualization(federation: Federation) {
    this.router.navigate(['/visualization'], {
      queryParams: { federationCode: federation.code } // Assuming `id` uniquely identifies the federation
    });
  }

  deleteFederation(code: string): void {
    if (confirm('Are you sure you want to delete this federation?')) {
      this.federationService.deleteFederation(code).subscribe({
        next: () => {
          // Update the list by filtering out the deleted federation
          this.filteredFederations = this.filteredFederations.filter(fed => fed.code !== code);
          console.log('Federation deleted successfully');
        },
        error: (err) => console.error('Error deleting federation:', err),
      });
    }
  }

  // Handle filter selection
  selectFilter(filter: string) {
    this.selectedFilter = filter;
    this.filteredFederations = this.federations;
    //TODO: if (filter === 'All') {
    //   this.filteredFederations = this.federations;
    // } else {
    //   this.filteredFederations = this.federations.filter(f => f.filter === filter);
    // }
  }
}
