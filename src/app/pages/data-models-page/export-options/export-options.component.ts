import { Component, Input, Output, EventEmitter } from '@angular/core';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-export-options',
  templateUrl: './export-options.component.html',
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
