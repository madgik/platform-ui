import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import { DataModelService } from '../../../services/data-model.service';
import { CommonModule } from '@angular/common';
import {FederationService} from "../../../services/federation.service";
import {ActivatedRoute, Router} from "@angular/router";
import {catchError, map} from "rxjs/operators";
import {of} from "rxjs";

@Component({
  selector: 'app-update-federation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-federation.component.html',
  styleUrls: ['./update-federation.component.css'],
})
export class UpdateFederationComponent implements OnInit {
  federationForm: FormGroup;
  dataModels: any[] = [];
  selectedDataModels: any[] = []; // Array to track selected data models
  selectedFederationCode: string= "federation";

  constructor(
    private fb: FormBuilder,
    private dataModelService: DataModelService,
    private federationService: FederationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.federationForm = this.fb.group({
      code: [''],
      title: [''],
      description: [''],
      institutions: [''],
      records: ['']
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const federationCode = params['federationCode'];
      this.federationService.getFederationsWithFullDataModelNames().subscribe({
        next: (federations) => {
          const federation = federations.find((fed) => fed.code === federationCode) || null;

          if (federation) {
            this.federationForm = this.fb.group({
              code: [federation.code],
              title: [federation.title],
              description: [federation.description],
              institutions: [federation.institutions],
              records: [federation.records]
            });

            this.loadDataModels();
            this.selectedDataModels = [...federation.dataModelIds];

            this.selectedFederationCode = federation.code;
          }
          else {
            console.error("Federation not found.");
          }

        },
        error: (error) => console.error('Error loading federations:', error),
      });
    });
  }

  loadDataModels(): void {
    console.log('Loading data models...');
    this.dataModelService.getAllReleasedDataModels().subscribe({
      next: (models) => {
        console.log('Data models loaded:', models);
        this.dataModels = models;
      },
      error: (error) => console.error('Error loading data models:', error),
    });
  }

  onDataModelChange(event: any): void {
    const selectedModel = event.target.value;
    if (event.target.checked) {
      // Add to selectedDataModels if not already present
      if (!this.selectedDataModels.includes(selectedModel)) {
        this.selectedDataModels.push(selectedModel);
      }
    } else {
      // Remove from selectedDataModels if unchecked
      this.selectedDataModels = this.selectedDataModels.filter(
        (model) => model !== selectedModel
      );
    }
  }


  submitForm(): void {
    if (this.federationForm.valid) {
      const federationData = {
        ...this.federationForm.value,
        dataModelIds: this.selectedDataModels,
      };
      console.log("Submitting federation form with data:", federationData);

      this.federationService.updateFederation(this.selectedFederationCode, federationData).subscribe({
        next: (response) => {
          console.log('Federation updated successfully:', response);
          this.router.navigate(['/federations']);
        },
        error: (error) => {
          console.error('Error creating federation:', error);
        },
      });
    }
  }
}
