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
    this.federationService.getFederationsWithModels().subscribe({
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

  goToAddFederation() {
    console.log('Navigating to Add Federation page');
    this.router.navigate(['/add-federation']);
  }

  goToUpdateFederation(federationCode: string) {
    console.log('Navigating to Update Federation page');
    this.router.navigate(['/update-federation'], {
      queryParams: { federationCode: federationCode } // Assuming `id` uniquely identifies the federation
    });
  }

  // Method to navigate to the /visualization route with a specified federation
  goToVisualization(federationCode: string) {
    this.router.navigate(['/visualization'], {
      queryParams: { federationCode: federationCode } // Assuming `id` uniquely identifies the federation
    });
  }

  deleteFederation(federationCode: string): void {
    if (confirm('Are you sure you want to delete this federation?')) {
      this.federationService.deleteFederation(federationCode);
    }
    this.router.navigate(['/federations']);
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
