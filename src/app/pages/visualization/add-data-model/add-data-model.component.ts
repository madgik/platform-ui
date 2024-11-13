import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {CommonModule} from "@angular/common";
import {DataModelService} from "../../../services/data-model.service";

@Component({
  selector: 'app-add-data-model',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-data-model.component.html',
  styleUrls: ['./add-data-model.component.css'],
})
export class AddDataModelComponent {
  dataModelForm: FormGroup;
  selectedFileType: string = 'json';
  file: File | null = null;

  constructor(
    private dataModelService:DataModelService,
    private fb: FormBuilder,
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
    if (this.selectedFileType === 'json'){
      this.dataModelService.createDataModelFromJson(this.file)
    } else if (this.selectedFileType === 'xlsx') {
      const version = this.dataModelForm.get('version')?.value;
      const longitudinal = this.dataModelForm.get('longitudinal')?.value;
      this.dataModelService.createDataModelFromExcel(this.file, version, longitudinal)
    }
    this.router.navigate(['/visualization']);
    console.log('Data Model created successfully');
  }
}
