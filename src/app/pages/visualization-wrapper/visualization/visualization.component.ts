import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef } from '@angular/core';
import { createSunburst } from './zoomable-sunburst';
import { createTidyTree } from './tidy-tree';
import {FormsModule} from "@angular/forms";
import {createZoomableCirclePacking} from "./zoomable circle-packing";

@Component({
  selector: 'app-visualization',
  template: `
    <div class="visualization-type-container">
      <label for="visualization">Select Visualization:</label>
      <select class="dropdown" id="visualization" (change)="onVisualizationTypeChange($event)">
        <option value="ZoomableCirclePacking">Zoomable Circle Packing</option>
        <option value="ZoomableSunburst">Zoomable Sunburst</option>
        <option value="TidyTree">TidyTree</option>
      </select>
    </div>

    <!-- Chart container with scrolling capability -->
    <div id="chart-container">
      <div id="chart" style="width: 100%; height: 800px;"></div>
    </div>
  `,
  styleUrls: ['./visualization.component.css'],
  standalone: true,
  imports: [
    FormsModule
  ],
})
export class VisualizationComponent implements OnChanges {
  @Input() visualizationType = 'ZoomableCirclePacking';
  @Input() d3Data: any;
  @Output() selectedNodeChange = new EventEmitter<any>(); // Emits the selected node

  constructor(private elementRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['d3Data'] && this.d3Data) {
      this.renderChart();
    }
  }

  onVisualizationTypeChange(event: any): void {
    this.visualizationType = event.target.value;
    this.renderChart();
  }

  renderChart(): void {
    const container = this.elementRef.nativeElement.querySelector('#chart');
    container.innerHTML = ''; // Clear previous chart

    if (!this.d3Data) {
      console.error('No data available for visualization.');
      return;
    }

    const handleNodeClick = (node: any) => {
      this.selectedNodeChange.emit(node); // Emit the selected node to parent
    };

    switch (this.visualizationType) {
      case 'ZoomableCirclePacking':
        createZoomableCirclePacking(this.d3Data, container, handleNodeClick);
        break;
      case 'ZoomableSunburst':
        createSunburst(this.d3Data, container, handleNodeClick);
        break;
      case 'TidyTree':
        createTidyTree(this.d3Data, container, handleNodeClick);
        break;
      default:
        console.error('Unknown visualization type:', this.visualizationType);
    }
  }
}
