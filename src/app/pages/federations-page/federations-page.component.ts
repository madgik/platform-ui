import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FederationService } from '../../services/federation.service';
import {Federation} from "../../interfaces/federations.interface";
import {DataModelService} from "../../services/data-model.service";

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

  ngOnInit(): void {
    this.federationService.getFederationsWithFullDataModelNames().subscribe({
      next: (federations) => {
        this.federations = federations;
        this.filteredFederations = federations;  // If you use a filtered list
      },
      error: (error) => console.error('Error loading federations:', error)
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
