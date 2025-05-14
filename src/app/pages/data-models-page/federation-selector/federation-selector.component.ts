import {Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {Federation} from "../../../interfaces/federations.interface";
import {FederationService} from "../../../services/federation.service";

@Component({
  selector: 'app-federation-selector',
  styleUrls: ['./federation-selector.component.css'],
  templateUrl: './federation-selector.component.html',
  standalone: true,
  imports: [
    FormsModule,
  ]
})
export class FederationSelectorComponent implements OnInit , OnChanges {
  @Input() isDomainExpert: boolean = false; // Controls whether "All Federations" is available
  @Input() defaultFederation: Federation | null = null;
  @Output() federationChange = new EventEmitter<Federation | null>();

  federations: Federation[] = [];
  selectedFederation: Federation | null = null;

  constructor(private federationService: FederationService) {}

  ngOnInit(): void {
    this.loadFederations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultFederation'] && changes['defaultFederation'].currentValue) {
      this.selectedFederation = this.federations.find(
        (fed) => fed.code === changes['defaultFederation'].currentValue?.code
      ) || null;
    }
  }


  loadFederations(): void {
    this.federationService.getFederationsWithModels().subscribe({
      next: (federations: Federation[]) => {
        this.federations = federations;
        // Set selected federation after loading federations
        if (this.defaultFederation) {
          this.selectedFederation = this.federations.find(
            (fed) => fed.code === this.defaultFederation?.code
          ) || null;
        }
      },
      error: (error: any) => console.error('Error loading federations:', error),
    });
  }

  onFederationChange(): void {
    this.emitFederationChange();
  }

  private emitFederationChange(): void {
    this.federationChange.emit(this.selectedFederation);
  }
}
