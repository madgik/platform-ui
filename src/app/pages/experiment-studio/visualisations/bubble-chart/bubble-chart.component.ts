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
  @Output() selectedNodeChange = new EventEmitter<any>();

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
      console.log('d3Data updated:', this.d3Data);
      this.renderChart();
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
    createZoomableCirclePacking(this.d3Data, container, handleNodeClick);
  }

  requestBody = {
    input: {
      inputdata: {
        y: ["alzheimerbroadcategory"],
        x: null,
        data_model: "dementia:0.1",
        datasets: [
          "edsd3",
          "ppmi9",
          "ppmi4",
          "ppmi5",
          "desd-synthdata7",
          "desd-synthdata8",
          "desd-synthdata3",
          "desd-synthdata4",
          "desd-synthdata2",
          "edsd0",
          "ppmi3",
        ],
        filters: null,
      },
      parameters: {
        bins: 19,
      },
      test_case_num: 0,
    },
  };

  onNodeClick(node: any): void {
    console.log('Node clicked:', node);
    this.selectedNodeChange.emit(node);
    console.log("this is the node info: ", node);
  }
}
