import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataModelService } from '../../../services/data-model.service';
import { FederationService } from '../../../services/federation.service';

@Component({
  selector: 'app-federation-form',
  templateUrl: './federation-form.component.html',
  styleUrls: ['./federation-form.component.css'],
  imports: [
    ReactiveFormsModule,
  ],
  standalone: true
})
export class FederationFormComponent implements OnInit {
  @Output() federationUpdated = new EventEmitter<void>(); // Event to notify parent

  federationForm: FormGroup;
  dataModels: any[] = [];
  selectedDataModels: string[] = [];
  isUpdateMode: boolean = false;
  federationCode: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dataModelService: DataModelService,
    private federationService: FederationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.federationForm = this.fb.group({
      code: ['', Validators.required],
      title: ['', Validators.required],
      url: ['', Validators.required],
      description: ['', Validators.required],
      institutions: ['', Validators.required],
      records: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.isUpdateMode = data['isUpdate'];
    });

    if (this.isUpdateMode) {
      this.route.queryParams.subscribe((params) => {
        this.federationCode = params['federationCode'];
        this.loadFederation(this.federationCode!);
      });
    }

    this.loadDataModels();
  }

  loadFederation(code: string): void {
    this.federationService.getFederationsWithModels().subscribe((federations) => {
      const federation = federations.find((f) => f.code === code);
      if (federation) {
        this.federationForm.patchValue({
          code: federation.code,
          title: federation.title,
          url: federation.url,
          description: federation.description,
          institutions: federation.institutions,
          records: federation.records,
        });
        this.selectedDataModels = [...federation.dataModelIds];
      }
    });
  }

  loadDataModels(): void {
    this.dataModelService.getAllReleasedDataModels().subscribe((models) => {
      this.dataModels = models;
    });
  }

  onDataModelChange(event: any): void {
    const selectedModel = event.target.value;
    if (event.target.checked) {
      if (!this.selectedDataModels.includes(selectedModel)) {
        this.selectedDataModels.push(selectedModel);
      }
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

      if (this.isUpdateMode && this.federationCode) {
        this.federationService
          .updateFederation(this.federationCode, federationData)
          .subscribe({
            next: () => {
              this.federationUpdated.emit(); // Notify parent
              this.router.navigate(['/federations']); // Navigate back to federations list
            },
            error: (error) => console.error('Error updating federation:', error),
          });
      } else {
        this.federationService.createFederation(federationData).subscribe({
          next: () => {
            this.federationUpdated.emit(); // Notify parent
            this.router.navigate(['/federations']); // Navigate back to federations list
          },
          error: (error) => console.error('Error creating federation:', error),
        });
      }
    }
  }
}
