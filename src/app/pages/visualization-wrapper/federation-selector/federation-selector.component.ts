import {Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {Federation} from "../../../interfaces/federations.interface";
import {FederationService} from "../../../services/federation.service";
import {NgForOf, NgIf} from "@angular/common";

@Component({
  selector: 'app-federation-selector',
  template: `
    <div>
      <label for="federation">Select Federation:</label>
      <select
        id="federation"
        class="dropdown"
        [(ngModel)]="selectedFederation"
        (change)="onFederationChange()"
      >
        <option *ngIf="isDomainExpert" [ngValue]="null">---</option>
        <option
          *ngFor="let federation of federations"
          [ngValue]="federation"
        >
          {{ federation.code }}
        </option>
      </select>
    </div>
  `,
  styleUrls: ['./federation-selector.component.css'],
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgForOf
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
    console.log('Emitting Federation Change:', this.selectedFederation);
    this.federationChange.emit(this.selectedFederation);
  }
}
