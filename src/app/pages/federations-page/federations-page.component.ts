import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-federations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './federations-page.component.html',
  styleUrls: ['./federations-page.component.css']
})
export class FederationsPageComponent {
  filters = ['All', 'Public', 'Accessed', 'Request Access', 'Pathology'];  // Define filter options
  selectedFilter = 'All';  // Default filter selection

  federations = [
    { image: 'assets/mental-health.png', title: 'Mental Health', records: 92000, institutions: 13, dataModel: 'MentalHealth_v10', description: 'The federation aims at exploring large-scale Mental Health datasets including clinical signs and symptoms...', filter: "Public"},
    { image: 'assets/dementia.png', title: 'Dementia', records: 28000, institutions: 8, dataModel: 'Dementia_v12', description: 'The dementia federation primarily illustrates the feasibility and value of federating real-world clinical data...', filter: "Accessed" },
    { image: 'assets/tbi.png', title: 'Traumatic Brain Injury', records: 60000, institutions: 6, dataModel: 'TBI_v2', description: 'The federation aims at exploring large-scale Mental Health datasets including clinical signs and symptoms...', filter: "Request Access" },
    { image: 'assets/epilepsy.png', title: 'Epilepsy', records: 16000, institutions: 10, dataModel: 'Epilepsy_v7', description: 'The epilepsy federation aims to explore data from over 3000 cases of epilepsy across several institutions.', filter: "Accessed" },
    { image: 'assets/tbi2.jpeg', title: 'FERES', records: 3000, institutions: 4, dataModel: 'FERES_V5', description: 'The epilepsy federation aims to explore data from over 3000 cases of epilepsy across several institutions.', filter: "Public" },
    { image: 'assets/epilepsy2.png', title: 'REPOMSE', records: 54000, institutions: 7, dataModel: 'REPOMSE_V3', description: 'The epilepsy federation aims to explore data from over 3000 cases of epilepsy across several institutions.', filter: "Pathology" },
  ];

  filteredFederations = this.federations;

// Handle filter selection
selectFilter(filter: string) {
  this.selectedFilter = filter;
  if (filter === 'All') {
    this.filteredFederations = this.federations;
  } else {
    this.filteredFederations = this.federations.filter(f => f.filter === filter);
  }
}
}
