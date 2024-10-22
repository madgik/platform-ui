import { Component } from '@angular/core';
import { Federation } from '../../interfaces/landing-page-federations.interface';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
})
export class LandingPageComponent {
  federations: Federation[] = [
    { image: 'assets/tbi.png', title: 'Traumatic Brain Injury', institutions: '4', records: '2000', description: 'Description for Traumatic Brain Injury.' },
    { image: 'assets/mental-health.png', title: 'Mental Health', institutions: '3', records: '3000', description: 'Description for Mental Health.' },
    { image: 'assets/dementia.png', title: 'Dementia', institutions: '4', records: '2000', description: 'Description for Dementia.' },
    { image: 'assets/dementia2.jpeg', title: 'FERES', institutions: '6', records: '2000', description: 'Description for FERES.' },
    { image: 'assets/epilepsy.png', title: 'Epilepsy', institutions: '4', records: '2000', description: 'Description for Epilepsy.' },
    { image: 'assets/mental-health2.jpeg', title: 'Mental Health', institutions: '2', records: '3000', description: 'Description for Mental Health.' },
    { image: 'assets/epilepsy2.png', title: 'REPOMSE', institutions: '5', records: '2000', description: 'Description for REPOMSE.' },
    { image: 'assets/tbi2.jpeg', title: 'MIP Hands-on', institutions: '2', records: '2000', description: 'Description for MIP Hands-on.' },
  ];

  selectedFederation!: Federation;

  // Initialize the component with the first federation selected by default
  ngOnInit(): void {
    this.selectDefaultFederation();
  }

  selectDefaultFederation(): void {
    if (this.federations.length > 0) {
      this.selectedFederation = this.federations[0]; // Select the first federation as default
    }
  }

  selectFederation(federation: Federation): void {
    this.selectedFederation = federation;
  }

  toggleFederationExpansion(federation: Federation) {
  // Collapse all other federations
  this.federations.forEach(fed => fed.isExpanded = false);
  // Toggle the clicked federation
  federation.isExpanded = !federation.isExpanded;
  }
}
