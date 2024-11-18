import {Component, OnInit} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {CommonModule} from "@angular/common";
import {DataModelService} from "../../../services/data-model.service";

@Component({
  selector: 'app-update-data-model',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-data-model.component.html',
  styleUrls: ['./update-data-model.component.css'],
})
export class UpdateDataModelComponent implements OnInit {
  dataModelForm: FormGroup;
  selectedFileType: string = 'json';
  file: File | null = null;
  selectedDataModelID: string | undefined;

  constructor(
    private dataModelService: DataModelService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.dataModelForm = this.fb.group({
      fileType: ["json"],
      file: [''],
      version: [''],        // New control for version
      longitudinal: [false] // New control for longitudinal (default to false)
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.selectedDataModelID = params['dataModelId'];
      });
  }
  onFileTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedFileType = target.value;
    this.file = null;
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.file = target.files[0];
    }
  }

  submitForm(): void {
    if (!this.file) {
      console.error('No file selected');
      return;
    }

    if (this.selectedDataModelID) {
      if (this.selectedFileType === 'json') {
        this.dataModelService.updateDataModelFromJson(this.selectedDataModelID, this.file).subscribe({
          next: () => {
            console.log('Data Model updated successfully (JSON).');
            this.router.navigate(['/visualization']);
          },
          error: (error) => console.error('Error updating data model (JSON):', error),
        });
      } else if (this.selectedFileType === 'xlsx') {
        const version = this.dataModelForm.get('version')?.value;
        const longitudinal = this.dataModelForm.get('longitudinal')?.value;
        this.dataModelService.updateDataModelFromExcel(this.selectedDataModelID, this.file, version, longitudinal).subscribe({
          next: () => {
            console.log('Data Model updated successfully (Excel).');
            this.router.navigate(['/visualization']);
          },
          error: (error) => console.error('Error updating data model (Excel):', error),
        });
      }
    } else {
      console.error('No data model ID provided.');
    }
  }

}
