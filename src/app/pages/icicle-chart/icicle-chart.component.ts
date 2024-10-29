import { Component, OnChanges, SimpleChanges, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { FederationService } from '../../services/federation.service';
import { Federation } from '../../interfaces/federations.interface';
import { DataModelService } from '../../services/data-model.service';

@Component({
  selector: 'app-icicle-chart',
  templateUrl: './icicle-chart.component.html',
  styleUrls: ['./icicle-chart.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class IcicleChartComponent implements OnInit, OnChanges {
  d3Data: any;
  federations: Federation[] = [];
  selectedFederation!: Federation;
  dataModels: string[] = [];
  selectedDataModelFullname: string = '';
  selectedNode: any;
  private focus: any;
  private root: any;
  private cell: any;
  private rect: any;
  private height: number = 900;

  constructor(
      private elementRef: ElementRef,
      private federationService: FederationService,
      private dataModelService: DataModelService,
  ) {}

  ngOnInit(): void {
    this.federationService.getFederationsWithFullDataModelNames().subscribe({
      next: (federations) => {
        this.federations = federations;
        this.selectDefaultFederation();
      },
      error: (error) => console.error('Error loading federations:', error)
    });
  }

  loadData(): void {
    console.log('loadData method called');
    if (this.selectedDataModelFullname) {
      const [code, version] = this.selectedDataModelFullname.split('_');
      this.dataModelService.getDataModelByCodeAndVersion(code, version).subscribe({
        next: (d3HierarchyData) => {
          if (d3HierarchyData) {
            this.d3Data = d3HierarchyData;
            this.createIcicleChart(this.d3Data);
          }
        },
        error: (error) => console.error('Error:', error),
      });
    }
  }

  selectDefaultFederation(): void {
    if (this.federations.length > 0) {
      this.selectedFederation = this.federations[0];
      this.dataModels = this.selectedFederation.dataModels;
      this.selectedDataModelFullname = this.dataModels.length > 0 ? this.dataModels[0] : '';
      this.loadData();
    }
  }

  onFederationChange(event: any): void {
    this.dataModels = this.selectedFederation.dataModels;
    this.selectedDataModelFullname = this.dataModels.length > 0 ? this.dataModels[0] : '';
    this.loadData();
  }

  onDataModelChange(event: any): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['d3Data'] && this.d3Data) {
      this.createIcicleChart(this.d3Data);
    }
  }

  createIcicleChart(data: any): void {
    const chartContainer = d3.select(this.elementRef.nativeElement).select('#chart');
    chartContainer.select('svg').remove();

    const width = 928;
    const height = this.height;

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

    const hierarchy = d3.hierarchy(data)
        .sum((d: any) => d.value ?? 0)
        .sort((a, b) => b.height - a.height || (b.value ?? 0) - (a.value ?? 0));

    this.root = d3.partition().size([height, (hierarchy.height + 1) * width / 3])(hierarchy);

    const svg = chartContainer.append('svg')
        .attr('viewBox', [0, 0, width, height])
        .attr('width', width)
        .attr('height', height)
        .attr('style', 'max-width: 100%; height: auto; font: 10px sans-serif;');

    this.cell = svg.selectAll('g')
        .data(this.root.descendants())
        .join('g')
        .attr('transform', (d: any) => `translate(${d.y0},${d.x0})`);

    this.rect = this.cell.append('rect')
        .attr('width', (d: any) => d.y1 - d.y0 - 1)
        .attr('height', (d: any) => this.rectHeight(d))
        .attr('fill-opacity', 0.6)
        .attr('fill', (d: any) => {
          if (!d.depth) return '#ccc';
          while (d.depth > 1) d = d.parent;
          return color(d.data.name);
        })
        .on('click', (event: any, p: any) => this.clicked(event, p));

    const text = this.cell.append('text')
        .attr('x', 4)
        .attr('y', 13)
        .attr('fill-opacity', (d: any) => this.labelVisible(d))
        .text((d: any) => d.data.name);
  }
  clicked(event: any, p: any): void {
    // If the clicked node is the currently focused node, zoom out to the parent node
    if (this.focus === p) {
      p = p.parent ? p.parent : p;  // Go up to the parent node if it exists
    }

    // Update the focus to the newly selected node
    this.focus = p;
    this.selectedNode = p;  // Update the node information

    // Recompute the layout for all nodes, adjusting their target positions relative to the new focus
    this.root.each((d: any) => {
      d.target = {
        x0: (d.x0 - p.x0) / (p.x1 - p.x0) * this.height,
        x1: (d.x1 - p.x0) / (p.x1 - p.x0) * this.height,
        y0: d.y0 - p.y0,
        y1: d.y1 - p.y0
      };
    });

    // Transition the chart to show the focused node in the center of the view
    const t = this.cell.transition().duration(750)
        .attr('transform', (d: any) => `translate(${d.target.y0},${d.target.x0})`);

    // Update the size of the rectangles (the cells of the Icicle chart)
    this.rect.transition(t)
        .attr('height', (d: any) => this.rectHeight(d.target));

    // Update the text labels based on visibility
    this.cell.select('text').transition(t)
        .attr('fill-opacity', (d: any) => +this.labelVisible(d.target));
  }


  rectHeight(d: any): number {
    return d.x1 - d.x0 - Math.min(1, (d.x1 - d.x0) / 2);
  }

  labelVisible(d: any): boolean {
    return d.y1 <= 928 && d.x1 - d.x0 > 16;
  }

  transformNode(d: any, p: any): any {
    return {
      x0: ((d.x0 - p.x0) / (p.x1 - p.x0)) * this.height,
      x1: ((d.x1 - p.x0) / (p.x1 - p.x0)) * this.height,
      y0: d.y0 - p.y0,
      y1: d.y1 - p.y0,
    };
  }
}
