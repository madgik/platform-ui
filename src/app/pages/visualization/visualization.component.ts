import {Component, OnInit, ElementRef, OnChanges, SimpleChanges, signal, HostListener} from '@angular/core';
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
import {MatMenu, MatMenuItem, MatMenuTrigger} from "@angular/material/menu";
import {MatIcon} from "@angular/material/icon";
import {MatIconButton} from "@angular/material/button";
import {createSunburst} from "./zoomable-sunburst";
import {createTidyTree} from "./tidy-tree";
import {DataModel} from "../../interfaces/data-model.interface";

@Component({
  selector: 'app-visualization',
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css'],
  imports: [CommonModule, FormsModule, MatMenuTrigger, MatIcon, MatMenu, MatIconButton, MatMenuItem],
  standalone: true
})
export class VisualizationComponent  implements OnInit, OnChanges {
  visualizationType = 'ZoomableCirclePacking';
  d3Data: any;
  federations: Federation[] = [];
  selectedFederation: Federation | null = null; // Allow null for "All Federations"
  selectedNode: any;
  isDomainExpert = false;
  optionsVisible = signal(false); // Signal for options menu visibility
  exportOptionsVisible = signal(false); // Signal for export options visibility
  selectedDataModelFullname = signal<string | null>(null); // Signal for selected data model
  selectedFileType = signal<'json' | 'xlsx'>('json'); // Signal for file type selection
  nodeInfoVisible: boolean = true;
  crossSectionalModels: any[] = [];
  longitudinalModels: any[] = [];

  constructor(
    private elementRef: ElementRef,
    private federationService: FederationService,
    private dataModelService: DataModelService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}
  //TODO:Make the same as old frontend and divide data models on cross sectional and longitudinal.

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
    console.log("Loading data models...");
    if (this.selectedFederation) {
      console.log("Selected federation detected:", this.selectedFederation);

      // Load data models by IDs for the selected federation
      this.dataModelService.getDataModelsByIds(this.selectedFederation.dataModelIds).subscribe({
        next: (dataModels) => {
          console.log("Data models retrieved for federation:", dataModels);
          this.setDataModelCategories(dataModels);
        },
        error: (error) => console.error("Error loading federation data models:", error),
      });
    } else {
      console.log("No specific federation selected, loading all data models...");

      // Load all data models if "All Federations" is selected
      this.dataModelService.loadAllDataModels().subscribe({
        next: (dataModels) => {
          console.log("All data models retrieved:", dataModels);
          this.setDataModelCategories(dataModels);
        },
        error: (error) => console.error("Error loading all data models:", error),
      });
    }
    this.loadData();
  }

  // Helper function to separate data models into cross-sectional and longitudinal
  setDataModelCategories(dataModels: any[]): void {
    console.log("Categorizing data models into Cross-Sectional and Longitudinal...");

    // Separate data models by type
    this.crossSectionalModels = dataModels
      .filter((model) => model.longitudinal === false)
      .map((model) => {
        const formattedModel = { fullname: `${model.code}_${model.version}`, name: model.name };
        console.log("Cross-Sectional model added:", formattedModel);
        return formattedModel;
      });

    this.longitudinalModels = dataModels
      .filter((model) => model.longitudinal === true)
      .map((model) => {
        const formattedModel = { fullname: `${model.code}_${model.version}`, name: model.name };
        console.log("Longitudinal model added:", formattedModel);
        return formattedModel;
      });

    console.log("Cross-Sectional Models:", this.crossSectionalModels);
    console.log("Longitudinal Models:", this.longitudinalModels);

    // Default to the first available data model in cross-sectional or longitudinal
    const firstModel = this.crossSectionalModels[0] || this.longitudinalModels[0];
    if (firstModel) {
      console.log("Setting default selected data model to:", firstModel.fullname);
      this.selectedDataModelFullname.set(firstModel.fullname);
    } else {
      console.warn("No data models found to set as default.");
      this.selectedDataModelFullname.set('');
    }
  }



  loadData(): void {
    const selectedDataModel = this.selectedDataModelFullname();

    if (selectedDataModel) {
      this.dataModelService.getDataModelByFullname(selectedDataModel).subscribe({
        next: (data_model) => {
          const container = this.elementRef.nativeElement.querySelector('#chart');
          container.innerHTML = ''; // Clear previous chart
          const d3Hierarchy = this.dataModelService.convertToD3Hierarchy(data_model);
          console.log('Data model converted to D3 hierarchy format:', d3Hierarchy);
          if (d3Hierarchy) {
            this.d3Data = d3Hierarchy;
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

  onFederationChange(): void {
    this.loadDataModels();
  }


  onDataModelChange(): void {
    this.loadData();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['d3Data'] && this.d3Data) {
      const container = this.elementRef.nativeElement.querySelector('#chart');
      container.innerHTML = '';

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
      case 'ZoomableSunburst':
        createSunburst(this.d3Data, container, this);
        break;
      case 'TidyTree':
        createTidyTree(this.d3Data, container, this);
        break;
      default:
        console.error('Unknown visualization type:', this.visualizationType);
    }
  }

  onVisualizationTypeChange(event: any): void {
    this.visualizationType = event.target.value;
    this.loadData();
  }

  gotoAddDataModel(): void {
    this.router.navigate(['/add-data-model']);
    this.optionsVisible.set(false);
  }

  goToUpdateDataModel() {
    console.log('Navigating to Update Data model');
    const fullname = this.selectedDataModelFullname();
    if (fullname) {
      this.dataModelService.getDataModelByFullname(fullname).subscribe({
        next: (data_model) => {
          this.router.navigate(['/update-data-model'], {
            queryParams: { dataModelId: data_model.uuid}
          });
        },
        error: (error) => console.error('Error:', error),
      });

    }
    this.optionsVisible.set(false);
  }

  deleteDataModel() {
    const userConfirmed = window.confirm("Are you sure you want to delete this data model?");
    if (!userConfirmed) {
      return;
    }
    const selectedDataModel = this.selectedDataModelFullname();
    if (selectedDataModel){

      this.dataModelService.deleteDataModel(selectedDataModel);
      this.optionsVisible.set(false);
    }
  }

  isSelectedDataModelReleased(): boolean {
    const selectedDataModel = this.selectedDataModelFullname();
    let dataModelReleased = false;
    if (selectedDataModel) {
      this.dataModelService.getDataModelByFullname(selectedDataModel).subscribe({
        next: (data_model: DataModel) => {
          dataModelReleased = data_model.released; // Update the property
        },
        error: (error) => {
          console.error('Error:', error);
        }
      });
    }
    return dataModelReleased;
  }

  releaseDataModel() {
    const userConfirmed = window.confirm(
      "Are you sure you want to release this data model? " +
      "Once released, you will no longer be able to delete, update, or revert this data model."
    );
    if (!userConfirmed) {
      return;
    }    const selectedDataModel = this.selectedDataModelFullname();
    if (selectedDataModel){
      this.dataModelService.releaseDataModel(selectedDataModel);
      this.optionsVisible.set(false);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent) {
    if (this.optionsVisible()) {
      this.toggleOptionsMenu();
    }
  }


  toggleNodeInfo(): void {
    this.nodeInfoVisible = !this.nodeInfoVisible;
  }

  toggleOptionsMenu(): void {
    this.optionsVisible.update((visible: any) => !visible);
    this.exportOptionsVisible.set(false);

    // Set focus on the first menu item when opening the menu
    if (this.optionsVisible()) {
      setTimeout(() => {
        const firstMenuItem = this.elementRef.nativeElement.querySelector('.options-menu button');
        firstMenuItem?.focus();
      }, 0);
    }
  }



  showExportOptions(): void {
    this.exportOptionsVisible.set(true); // Show file type selection
  }

  exportDataModel(): void {
    this.toggleOptionsMenu();
    const selectedDataModel = this.selectedDataModelFullname();
    const fileType = this.selectedFileType();

    if (selectedDataModel) {
      this.dataModelService.exportDataModel(selectedDataModel, fileType);
    }

  }
}
