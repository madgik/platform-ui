import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener, ElementRef } from '@angular/core';

@Component({
  selector: 'app-dataset-selector',
  standalone: true,
  templateUrl: './dataset-selector.component.html',
  styleUrls: ['./dataset-selector.component.css'],
})
export class DatasetSelectorComponent implements OnChanges {
  @Input() datasets: { code: string; label: string }[] = [];
  @Output() selectedDatasetsChange = new EventEmitter<string[]>();
  isDropdownOpen = false;

  constructor(private elementRef: ElementRef) {}

  selectedDatasets = new Set<string>(); // Store selected datasets

  ngOnChanges(changes: SimpleChanges): void {
    // Preselect all datasets when input datasets change
    if (changes['datasets'] && this.datasets.length > 0) {
      this.preselectAllDatasets();
    }
  }
  onDatasetSelectionChange(event: Event): void {
    const selectedOptions = (event.target as HTMLSelectElement).selectedOptions;
    this.selectedDatasets = new Set(
      Array.from(selectedOptions).map((option) => option.value)
    );
    this.emitSelectedDatasets();
  }
  toggleDataset(datasetCode: string): void {
    // Add or remove dataset based on selection
    if (this.selectedDatasets.has(datasetCode)) {
      this.selectedDatasets.delete(datasetCode);
    } else {
      this.selectedDatasets.add(datasetCode);
    }
    this.emitSelectedDatasets();
  }

  isDatasetSelected(datasetCode: string): boolean {
    return this.selectedDatasets.has(datasetCode);
  }

  emitSelectedDatasets(): void {
    this.selectedDatasetsChange.emit(Array.from(this.selectedDatasets));
  }

  private preselectAllDatasets(): void {
    this.selectedDatasets = new Set(this.datasets.map((dataset) => dataset.code));
    this.emitSelectedDatasets(); // Emit the preselected datasets
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

}
