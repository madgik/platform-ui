import {Component, OnInit, ElementRef, OnChanges, SimpleChanges} from '@angular/core';
import {createZoomableTreemap} from "./zoomable-treemap";
import {createIcicleChart} from "./zoomable-icicle-chart";
import {FormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {Federation} from "../../interfaces/federations.interface";
import {FederationService} from "../../services/federation.service";
import {DataModelService} from "../../services/data-model.service";
import {createSimpleTreemap} from "./simple-treemap";
import {createZoomableCirclePacking} from "./zoomable circle-packing";

@Component({
  selector: 'app-visualization',
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css'],
  imports: [CommonModule, FormsModule],
  standalone: true
})
export class VisualizationComponent  implements OnInit, OnChanges {
  visualizationType = 'ZoomableCirclePacking';
  d3Data: any;
  federations: Federation[] = [];
  selectedFederation!: Federation;
  dataModels: string[] = [];
  selectedDataModelFullname: string = '';
  selectedNode: any;

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

  renderVisualization(container: HTMLElement): void {
    switch (this.visualizationType) {
      case 'ZoomableCirclePacking':
        createZoomableCirclePacking(this.d3Data, container, this); // Pass 'this'
        break;
      case 'ZoomableTreemap':
        createZoomableTreemap(this.d3Data, container, this); // Pass 'this'
        break;
      case 'Treemap':
        createSimpleTreemap(this.d3Data, container, this); // Pass 'this'
        break;
      case 'ZoomableIcicle':
        createIcicleChart(this.d3Data, container, this); // Pass 'this'
        break;
      default:
        console.error("Unknown visualization type:", this.visualizationType);
    }
  }



  loadData(): void {
    console.log('loadData method called');
    if (this.selectedDataModelFullname) {
      const [code, version] = this.selectedDataModelFullname.split('_');
      this.dataModelService.getDataModelByCodeAndVersion(code, version).subscribe({
        next: (d3HierarchyData) => {
          const container = this.elementRef.nativeElement.querySelector('#chart');
          container.innerHTML = '';  // Clear previous chart

          if (d3HierarchyData) {
            this.d3Data = d3HierarchyData;
            this.renderVisualization(container)
          }
        },
        error: (error) => console.error('Error:', error),
      });
    }
  }

  setSelectedNode(node: any): void {
    this.selectedNode = node;
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
      const container = this.elementRef.nativeElement.querySelector('#chart');
      container.innerHTML = '';  // Clear previous chart

      if (this.d3Data) {
        this.renderVisualization(container)
      }
    }
  }
  onVisualizationTypeChange(event: any) {
    this.visualizationType = event.target.value;
    this.loadData();  // Reload visualization with new type
  }
}
