import { Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Output, ElementRef, inject } from '@angular/core';
import { createZoomableCirclePacking } from './zoomable-circle-packing';
import { ErrorService } from '../../../data-models-page/services/error.service';

@Component({
  selector: 'app-bubble-chart',
  standalone: true,
  templateUrl: './bubble-chart.component.html',
  styleUrls: ['./bubble-chart.component.css'],
  imports: []
})

export class BubbleChartComponent implements OnInit, OnChanges {
  @Input() d3Data: any;
  @Input() highlightNode: any | null = null;
  @Output() selectedNodeChange = new EventEmitter<any>();

  private lastHighlighted: any = null;
  private zoomToNodeFn!: (d: any) => void;

  error: string | null = null; // Holds the current error message

  constructor(private elementRef: ElementRef, private errorService: ErrorService) {
    // Subscribe to the error service
    this.errorService.error$.subscribe((message) => {
      this.error = message; // Update the local error property
    });
  }

  ngOnInit(): void {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['d3Data'] && changes['d3Data'].currentValue) {
      // console.log('d3Data updated:', this.d3Data);
      this.renderChart();
    }
    if (changes["highlightNode"] && this.highlightNode) {
     if (this.lastHighlighted?.code === this.highlightNode.code) {
    // Ίδιο node, skip
    return;
  }

  console.log('🔍 highlightNode changed:', this.highlightNode);
  this.zoomToNodeFn(this.highlightNode);
  this.lastHighlighted = this.highlightNode;
    } else {
      console.warn('ZoomToNodeFn is not set yet.');
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

    const { zoomToNode } = createZoomableCirclePacking(
      this.d3Data,
      container,
      node => {
        this.selectedNodeChange.emit(node);
        // this.lastHighlighted = node;
      }
    );
    this.zoomToNodeFn = zoomToNode;
  }

  onNodeClick(node: any): void {
    // console.log("this is the node info: ", node);
    this.selectedNodeChange.emit(node);
  }
}
