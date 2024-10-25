import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FederationService } from '../../services/federation.service';
import {Federation} from "../../interfaces/federations.interface";

@Component({
  selector: 'app-federations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './federations-page.component.html',
  styleUrls: ['./federations-page.component.css']
})
export class FederationsPageComponent implements OnInit {
  filters = ['All', 'Public', 'Accessed', 'Request Access', 'Pathology'];  // Define filter options
  selectedFilter = 'All';  // Default filter selection

  federations: Federation[] = [];  // Federations data from the service
  filteredFederations: Federation[] = [];  // To store filtered federations

  constructor(private federationService: FederationService) {}

  // Fetch data on initialization
  ngOnInit(): void {
    this.loadFederations();
  }

  // Method to load federations from the service
  loadFederations(): void {
    this.federationService.getFederations().subscribe({
      next: (data: Federation[]) => {
        this.federations = data;
        this.filteredFederations = data;  // Initially, all federations are shown
      },
      error: (error) => {
        console.error('Error fetching federations:', error);
      }
    });
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
