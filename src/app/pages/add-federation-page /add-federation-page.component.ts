import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import { DataModelService } from '../../services/data-model.service';
import { CommonModule } from '@angular/common';
import {FederationService} from "../../services/federation.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-add-federation-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],  // Add CommonModule here
  templateUrl: './add-federation-page.component.html',
  styleUrls: ['./add-federation-page.component.css'],
})
export class AddFederationPageComponent implements OnInit {
  federationForm: FormGroup;
  dataModels: any[] = [];
  selectedDataModels: any[] = []; // Array to track selected data models

  constructor(
    private fb: FormBuilder,
    private dataModelService: DataModelService,
    private federationService: FederationService,
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
    console.log('AddFederationPageComponent initialized');
    this.loadDataModels();
  }

  loadDataModels(): void {
    console.log('Loading data models...');
    this.dataModelService.loadAllDataModels().subscribe({
      next: (models) => {
        console.log('Data models loaded:', models);
        this.dataModels = models;
      },
      error: (error) => console.error('Error loading data models:', error),
    });
  }

  // Track selected data models
  onDataModelChange(event: any): void {
    const selectedModel = event.target.value;
    if (event.target.checked) {
      this.selectedDataModels.push(selectedModel);
    } else {
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
      console.log("Submitting federation form with data:", federationData);  // Log form data

      // Call the service to send data to backend
      this.federationService.createFederation(federationData).subscribe({
        next: (response) => {
          console.log('Federation created successfully:', response);
          this.router.navigate(['/federations']); // Redirect after successful submission
        },
        error: (error) => {
          console.error('Error creating federation:', error);
        },
      });
    }
  }
}
