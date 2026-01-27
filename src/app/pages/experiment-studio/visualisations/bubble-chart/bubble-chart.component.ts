import { Input, OnChanges, OnInit, SimpleChanges, AfterViewInit } from '@angular/core';
import { Component, EventEmitter, Output, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createZoomableCirclePacking } from './zoomable-circle-packing';
import { ErrorService } from '../../../../services/error.service';

@Component({
  selector: 'app-bubble-chart',
  standalone: true,
  templateUrl: './bubble-chart.component.html',
  styleUrls: ['./bubble-chart.component.css'],
  imports: [FormsModule],
})

export class BubbleChartComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() d3Data: any;
  @Input() highlightNode: any | null = null;
  @Input() selectedVariables: any[] = [];
  @Input() selectedCovariates: any[] = [];
  @Input() selectedFilters: any[] = [];
  @Input() bubbleColors?: Partial<{
    variable: string;
    covariate: string;
    filter: string;
    selected: string;
    groupStart: string;
    groupEnd: string;
  }>;

  @Output() selectedNodeChange = new EventEmitter<any>();

  private lastHighlighted: any = null;
  private zoomToNodeFn!: (d: any) => void;
  private viewReady = false;
  private refreshColorsFn!: (options?: {
    selectedVariables?: any[];
    selectedCovariates?: any[];
    selectedFilters?: any[];
    colors?: Partial<BubbleChartComponent['colors']>;
  }) => void;


  error: string | null = null; // Holds the current error message
  colors: {
    variable: string;
    covariate: string;
    filter: string;
    selected: string;
    groupStart: string;
    groupEnd: string;
  } = {
      variable: '#37c0ae',
      covariate: '#c88d00',
      filter: '#44bf00',
      selected: '#27d6d1',
      groupStart: '#bcefdc',
      groupEnd: '#4255a8',
    };

  constructor(private elementRef: ElementRef, private errorService: ErrorService) {
    // Subscribe to the error service
    this.errorService.error$.subscribe((message) => {
      this.error = message; // Update the local error property
    });
  }

  ngOnInit(): void {
    this.renderChart();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bubbleColors']?.currentValue) {
      this.colors = { ...this.colors, ...changes['bubbleColors'].currentValue };
      this.refreshColorsFn?.({ colors: this.colors });
    }

    if (changes['d3Data'] && changes['d3Data'].currentValue) {
      this.renderChart();
    }

    if (changes['highlightNode']?.currentValue && this.zoomToNodeFn) {
      if (!this.lastHighlighted || this.lastHighlighted.code !== this.highlightNode.code) {
        this.zoomToNodeFn(this.highlightNode);
        this.lastHighlighted = this.highlightNode;
      }
    }

    if (
      (changes['selectedVariables'] ||
        changes['selectedCovariates'] ||
        changes['selectedFilters']) &&
      this.refreshColorsFn
    ) {
      this.refreshColorsFn({
        selectedVariables: this.selectedVariables,
        selectedCovariates: this.selectedCovariates,
        selectedFilters: this.selectedFilters,
        colors: this.colors,
      });
    }
  }

  renderChart(): void {
    if (!this.viewReady) return;
    const container = this.elementRef.nativeElement.querySelector('#chart-canvas');
    if (!container) {
      this.errorService.setError('Chart container is not available.');
      return;
    }

    if (!this.d3Data) {
      this.errorService.setError('No data available for visualization.');
      return;
    }

    const { zoomToNode, refreshColors } = createZoomableCirclePacking(
      this.d3Data,
      container,
      node => this.selectedNodeChange.emit(node),
      {
        selectedVariables: this.selectedVariables,
        selectedCovariates: this.selectedCovariates,
        selectedFilters: this.selectedFilters,
        colors: this.colors,
      }
    );
    this.zoomToNodeFn = zoomToNode;
    this.refreshColorsFn = refreshColors;


    // apply pending highlight after chart is created
    if (this.highlightNode?.code) {
      this.zoomToNodeFn(this.highlightNode);
      this.lastHighlighted = this.highlightNode;
    }

  }

  public updateSelectionColors(): void {
    if (!this.zoomToNodeFn) return;
    this.renderChart(); // re-render to update fills
  }

  onNodeClick(node: any): void {
    this.selectedNodeChange.emit(node);
  }

  public zoomToNode(variable: any): void {
    if (this.zoomToNodeFn) {
      this.zoomToNodeFn(variable);
    } else {
      console.warn('zoomToNodeFn not ready yet, retrying...');
      setTimeout(() => {
        if (this.zoomToNodeFn) {
          this.zoomToNodeFn(variable);
        }
      }, 15);
    }
  }

  public refreshColors(newOptions?: {
    selectedVariables?: any[];
    selectedCovariates?: any[];
    selectedFilters?: any[];
  }): void {
    if (this.refreshColorsFn) {
      this.refreshColorsFn(newOptions ?? {
        selectedVariables: this.selectedVariables,
        selectedCovariates: this.selectedCovariates,
        selectedFilters: this.selectedFilters,
        colors: this.colors,
      });
    } else {
      console.warn('refreshColorsFn not ready yet.');
    }
  }

  onColorChange(): void {
    if (this.refreshColorsFn) {
      this.refreshColorsFn({ colors: this.colors });
    }
  }
}
