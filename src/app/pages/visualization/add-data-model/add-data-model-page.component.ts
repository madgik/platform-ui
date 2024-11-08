import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-add-data-model-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-data-model-page.component.html',
  styleUrls: ['./add-data-model-page.component.css'],
})
export class AddDataModelPageComponent {
  dataModelForm: FormGroup;
  selectedFileType: string = 'json';
  file: File | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.dataModelForm = this.fb.group({
      fileType: ["json"],
      file: [''],
      version: [''],        // New control for version
      longitudinal: [false] // New control for longitudinal (default to false)
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


    if (this.selectedFileType === 'json') {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataModelDTO = JSON.parse(reader.result as string);
          this.http.post('/services/datacatalogue/datamodels', dataModelDTO).subscribe({
            next: (response) => {
              this.router.navigate(['/visualization']);
              console.log('JSON Data Model created successfully:', response);
            },
            error: (error) => {
              console.error('Error creating JSON data model:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing JSON file:', error);
        }
      };
      reader.readAsText(this.file);
    } else if (this.selectedFileType === 'xlsx') {
      const formData = new FormData();
      formData.append('file', this.file);
      formData.append('version', this.dataModelForm.get('version')?.value);
      formData.append('longitudinal', this.dataModelForm.get('longitudinal')?.value);

      this.http.post('/services/datacatalogue/datamodels/import', formData).subscribe({
        next: (response) => {
          console.log('Excel Data Model imported successfully:', response);
          this.router.navigate(['/visualization']);
        },
        error: (error) => {
          console.error('Error importing Excel data model:', error);
        }
      });
    }
  }
}
