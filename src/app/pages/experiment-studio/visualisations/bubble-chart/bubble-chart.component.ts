import { Input, OnChanges, OnInit, SimpleChanges, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import { Component, EventEmitter, Output, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createZoomableCirclePacking } from './zoomable-circle-packing';

@Component({
  selector: 'app-bubble-chart',
  standalone: true,
  templateUrl: './bubble-chart.component.html',
  styleUrls: ['./bubble-chart.component.css'],
  imports: [FormsModule],
})

export class BubbleChartComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
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
  @Output() nodeDoubleClicked = new EventEmitter<any>();
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLElement>;

  private lastHighlighted: any = null;
  private zoomToNodeFn!: (d: any) => void;
  private viewReady = false;
  private refreshColorsFn!: (options?: {
    selectedVariables?: any[];
    selectedCovariates?: any[];
    selectedFilters?: any[];
    colors?: Partial<BubbleChartComponent['colors']>;
  }) => void;
  private destroyFn?: () => void;
  private resizeObserver?: ResizeObserver;
  private resizeRaf = 0;
  private lastSize = { width: 0, height: 0 };


  error: string | null = null; // Holds the current error message
  readonly DEFAULT_PALETTE = {
    variable: '#37c0ae',
    covariate: '#c88d00',
    filter: '#44bf00',
    selected: '#27d6d1',
    groupStart: '#bcefdc',
    groupEnd: '#4255a8',
  };

  readonly COLORBLIND_PALETTE = {
    variable: '#648fff',
    covariate: '#785ef0',
    filter: '#dc267f',
    selected: '#fe6100',
    groupStart: '#ffb000',
    groupEnd: '#004d40',
  };

  colorMode: 'default' | 'colorBlind' | 'custom' = 'default';

  colors: {
    variable: string;
    covariate: string;
    filter: string;
    selected: string;
    groupStart: string;
    groupEnd: string;
  } = { ...this.DEFAULT_PALETTE };

  showSettings = false;

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  applyColorMode(mode: 'default' | 'colorBlind' | 'custom'): void {
    this.colorMode = mode;
    if (mode === 'default') {
      this.colors = { ...this.DEFAULT_PALETTE };
    } else if (mode === 'colorBlind') {
      this.colors = { ...this.COLORBLIND_PALETTE };
    }
    this.saveSettings();
    this.onColorChange();
  }

  private readonly STORAGE_KEY = 'bubble_chart_colors';

  private saveSettings(): void {
    const settings = {
      mode: this.colorMode,
      colors: this.colors
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  private loadSettings(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.mode) this.colorMode = settings.mode;
        if (settings.colors) this.colors = { ...settings.colors };
      } catch (e) {
        console.error('Failed to load chart settings', e);
      }
    }
  }

  constructor(private elementRef: ElementRef) { }

  ngOnInit(): void {
    this.loadSettings();
    this.renderChart();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
    const canvas = this.chartCanvas?.nativeElement;
    if (canvas && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (Math.floor(width) === this.lastSize.width && Math.floor(height) === this.lastSize.height) return;
        this.lastSize = { width: Math.floor(width), height: Math.floor(height) };
        if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
        this.resizeRaf = requestAnimationFrame(() => this.renderChart());
      });
      this.resizeObserver.observe(canvas);
    }
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

  ngOnDestroy(): void {
    this.destroyFn?.();
    this.resizeObserver?.disconnect();
    if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
  }

  renderChart(): void {
    if (!this.viewReady) return;
    const container = this.chartCanvas?.nativeElement
      ?? this.elementRef.nativeElement.querySelector('#chart-canvas');
    if (!container) return;

    if (!this.d3Data) {
      this.error = 'No data available for visualization.';
      return;
    }
    this.error = null;

    // Clean up previous chart if exists (e.g. tooltip)
    this.destroyFn?.();

    const { zoomToNode, refreshColors, destroy } = createZoomableCirclePacking(
      this.d3Data,
      container,
      node => this.selectedNodeChange.emit(node),
      node => this.nodeDoubleClicked.emit(node),
      {
        selectedVariables: this.selectedVariables,
        selectedCovariates: this.selectedCovariates,
        selectedFilters: this.selectedFilters,
        colors: this.colors,
      }
    );
    this.zoomToNodeFn = zoomToNode;
    this.refreshColorsFn = refreshColors;
    this.destroyFn = destroy;


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
    this.saveSettings();
  }
}
