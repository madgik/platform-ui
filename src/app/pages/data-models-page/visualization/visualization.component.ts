import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef } from '@angular/core';
import {FormsModule} from "@angular/forms";
import {createZoomableCirclePacking} from "./zoomable circle-packing";
import {ErrorService} from "../services/error.service";

@Component({
  selector: 'app-visualization',
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css'],
  standalone: true,
  imports: [
    FormsModule,
  ],
})
export class VisualizationComponent implements OnChanges {
  @Input() d3Data: any;
  @Output() selectedNodeChange = new EventEmitter<any>();

  error: string | null = null; // Holds the current error message

  constructor(private elementRef: ElementRef, private errorService: ErrorService) {
    // Subscribe to the error service
    this.errorService.error$.subscribe((message) => {
      this.error = message; // Update the local error property
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['d3Data'] && this.d3Data) {
      this.errorService.clearError(); // Clear any previous error
      setTimeout(() => this.renderChart());

    }
  }

  renderChart(): void {
    const container = this.elementRef.nativeElement.querySelector('#chart');
    if (!container) {
      this.errorService.setError('Chart container is not available.');
      return;
    }
    container.innerHTML = ''; // Clear previous chart

    if (!this.d3Data) {
      this.errorService.setError('No data available for visualization.');
      return;
    }

    const handleNodeClick = (node: any) => {
      this.selectedNodeChange.emit(node); // Emit the selected node to parent
    };

    try {
      createZoomableCirclePacking(this.d3Data, container, handleNodeClick);
    } catch (e) {
      if (e instanceof Error) {
        this.errorService.setError(`An error occurred while rendering the chart: ${e.message}`);
      } else {
        this.errorService.setError('An unknown error occurred while rendering the chart.');
      }
    }
  }
}
