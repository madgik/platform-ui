import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FederationService } from '../../services/federation.service';
import { Federation } from "../../interfaces/federations.interface";
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
})
export class LandingPageComponent implements OnInit {
  federations: Federation[] = [];
  selectedFederation!: Federation;

  constructor(
    private federationService: FederationService,
    private authService: AuthService
  ) {}

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  ngOnInit(): void {
    // Check if user is logged in

    // Load federations
    this.federationService.getFederationsWithModels().subscribe({
      next: (federations) => {
        this.federations = federations;
      },
      error: (error) => console.error('Error loading federations:', error)
    });
  }

  selectDefaultFederation(): void {
    if (this.federations.length > 0) {
      this.selectedFederation = this.federations[0];
    }
  }

  selectFederation(federation: Federation): void {
    this.selectedFederation = federation;
  }
}
