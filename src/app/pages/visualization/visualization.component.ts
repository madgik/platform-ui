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
import {ActivatedRoute, Router} from '@angular/router';
import {AuthService} from "../../services/auth.service";

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
  selectedFederation: Federation | null = null; // Allow null for "All Federations"
  dataModels: string[] = [];
  selectedDataModelFullname: string = '';
  selectedNode: any;
  isDomainExpert = false;

  constructor(
    private elementRef: ElementRef,
    private federationService: FederationService,
    private dataModelService: DataModelService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.hasRole('DC_DOMAIN_EXPERT').subscribe((hasRole) => {
      this.isDomainExpert = hasRole;
    });

    this.route.queryParams.subscribe((params) => {
      const federationCode = params['federationCode'];
      this.federationService.getFederationsWithFullDataModelNames().subscribe({
        next: (federations) => {
          this.federations = federations;

          // Default to "All Federations" if no specific federation code is provided
          if (federationCode) {
            this.selectedFederation = federations.find((fed) => fed.code === federationCode) || null;
          } else {
            this.selectedFederation = null; // Set to "All Federations"
          }

          this.loadDataModels();
        },
        error: (error) => console.error('Error loading federations:', error),
      });
    });
  }

  loadDataModels(): void {
    if (this.selectedFederation) {
      // Load data models specific to the selected federation
      this.dataModels = this.selectedFederation.dataModels;
    } else {
      // Load all data models if "All Federations" is selected
      this.dataModelService.loadAllDataModels().subscribe({
        next: (dataModels) => {
          this.dataModels = dataModels.map((model) => `${model.code}_${model.version}`);
        },
        error: (error) => console.error('Error loading all data models:', error),
      });
    }
    this.selectedDataModelFullname = this.dataModels.length > 0 ? this.dataModels[0] : '';
    this.loadData();
  }

  loadData(): void {
    if (this.selectedDataModelFullname) {
      const lastUnderscoreIndex = this.selectedDataModelFullname.lastIndexOf('_');
      const code = this.selectedDataModelFullname.substring(0, lastUnderscoreIndex);
      const version = this.selectedDataModelFullname.substring(lastUnderscoreIndex + 1);
      this.dataModelService.getDataModelByCodeAndVersion(code, version).subscribe({
        next: (d3HierarchyData) => {
          const container = this.elementRef.nativeElement.querySelector('#chart');
          container.innerHTML = ''; // Clear previous chart

          if (d3HierarchyData) {
            this.d3Data = d3HierarchyData;
            this.renderVisualization(container);
          }
        },
        error: (error) => console.error('Error:', error),
      });
    }
  }

  setSelectedNode(node: any): void {
    this.selectedNode = node;
  }

  onFederationChange(event: any): void {
    this.loadDataModels(); // Reload data models based on the selected federation
  }
  onDataModelChange(event: any): void {
    this.loadData();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['d3Data'] && this.d3Data) {
      const container = this.elementRef.nativeElement.querySelector('#chart');
      container.innerHTML = ''; // Clear previous chart

      if (this.d3Data) {
        this.renderVisualization(container);
      }
    }
  }

  renderVisualization(container: HTMLElement): void {
    switch (this.visualizationType) {
      case 'ZoomableCirclePacking':
        createZoomableCirclePacking(this.d3Data, container, this);
        break;
      case 'ZoomableTreemap':
        createZoomableTreemap(this.d3Data, container, this);
        break;
      case 'Treemap':
        createSimpleTreemap(this.d3Data, container, this);
        break;
      case 'ZoomableIcicle':
        createIcicleChart(this.d3Data, container, this);
        break;
      default:
        console.error('Unknown visualization type:', this.visualizationType);
    }
  }

  onVisualizationTypeChange(event: any): void {
    this.visualizationType = event.target.value;
    this.loadData(); // Reload visualization with new type
  }

  navigateToAddDataModel(): void {
    this.router.navigate(['/add-data-model']);
  }
}
