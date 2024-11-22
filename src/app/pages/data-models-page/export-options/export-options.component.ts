import { Component, Input, Output, EventEmitter } from '@angular/core';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-export-options',
  template: `
    <div class="export-options">
      <label for="file-type-select" class="export-label">Format:</label>
      <select
        id="file-type-select"
        class="dropdown"
        [(ngModel)]="selectedFileType"
        aria-label="Choose export format"
      >
        <option value="json">JSON</option>
        <option value="xlsx">XLSX</option>
      </select>
      <button class="export-confirm-button" (click)="onExport()">
        <i class="printer-icon"></i> Export
      </button>
    </div>
  `,
  styleUrls: ['./export-options.component.css'],
  standalone: true,
  imports: [
    FormsModule
  ]
})
export class ExportOptionsComponent {
  @Input() selectedFileType: 'json' | 'xlsx' = 'json';
  @Output() export = new EventEmitter<'json' | 'xlsx'>();

  onExport(): void {
    this.export.emit(this.selectedFileType);
  }
}
