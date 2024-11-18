import {Component, OnInit, ElementRef, OnChanges, SimpleChanges, signal, HostListener} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {Federation} from "../../interfaces/federations.interface";
import {FederationService} from "../../services/federation.service";
import {DataModelService} from "../../services/data-model.service";
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
//TODO:LINK for federation
//TODO:request access for federation
//TODO:filters
//TODO:refactor
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

  ngOnInit(): void {
    this.initializeData()
  }

  private initializeData(): void {
    this.route.queryParams.subscribe((params) => {
      const federationCode = params['federationCode'];
      this.selectedFederation = federationCode
        ? this.federations.find((fed) => fed.code === federationCode) || null
        : null;

      this.authService.hasRole('DC_DOMAIN_EXPERT').subscribe((hasRole) => {
        this.isDomainExpert = hasRole;
      });

      this.federationService.getFederationsWithFullDataModelNames().subscribe({
        next: (federations) => {
          this.federations = federations;
          this.loadDataModels();
        },
        error: (error) => console.error('Error loading federations:', error),
      });
    });
  }

  loadAllDataModels(): void {
    this.dataModelService.getAllDataModels().subscribe({
      next: (dataModels) => {
        this.setDataModelCategories(dataModels);
        this.loadData(); // Ensure visualization refresh
      },
      error: (error) => console.error('Error loading all data models:', error),
    });
  }

  loadDataModels(): void {
    if (this.selectedFederation) {
      this.dataModelService.getDataModelsByIds(this.selectedFederation.dataModelIds).subscribe({
        next: (dataModels) => {
          this.setDataModelCategories(dataModels);
          this.loadData(); // Ensure visualization refresh
        },
        error: (error) => console.error('Error loading federation data models:', error),
      });
    } else {
      this.loadAllDataModels()
    }
  }


  setDataModelCategories(dataModels: any[]): void {
    this.crossSectionalModels = [];
    this.longitudinalModels = [];

    console.log("[setDataModelCategories] dataModels", dataModels)
    this.crossSectionalModels = dataModels
      .filter((model) => !model.longitudinal)
      .map((model) => ({ fullname: `${model.code}_${model.version}`, name: model.name }));

    this.longitudinalModels = dataModels
      .filter((model) => model.longitudinal)
      .map((model) => ({ fullname: `${model.code}_${model.version}`, name: model.name }));

    // Set a default model if one exists
    const firstModel = this.crossSectionalModels[0] || this.longitudinalModels[0];
    this.selectedDataModelFullname.set(firstModel ? firstModel.fullname : null);
  }

  loadData(): void {
    const selectedDataModel = this.selectedDataModelFullname();
    if (selectedDataModel) {
      this.dataModelService.getDataModelByFullname(selectedDataModel).subscribe({
        next: (data_model) => {
          const container = this.elementRef.nativeElement.querySelector('#chart');
          container.innerHTML = '';
          this.d3Data = this.dataModelService.convertToD3Hierarchy(data_model);
          this.renderChart();
          this.selectedNode = {
            data: { name: this.d3Data.name, code: this.d3Data.code },
            children: this.d3Data.children,
          };
        },
        error: (error) => console.error('Error:', error),
      });
    }
  }

  renderChart(): void {
    const container = this.elementRef.nativeElement.querySelector('#chart');
    container.innerHTML = '';
    switch (this.visualizationType) {
      case 'ZoomableCirclePacking':
        createZoomableCirclePacking(this.d3Data, container, this);
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
    this.router.navigate(['/add-data-model']).then(() => {
      console.log('Navigated to Add Data Model page.');
    });
    this.optionsVisible.set(false);
  }


  goToUpdateDataModel(): void {
    const fullname = this.selectedDataModelFullname();
    if (fullname) {
      this.dataModelService.getDataModelByFullname(fullname).subscribe({
        next: (data_model) => {
          this.router.navigate(['/update-data-model'], {
            queryParams: { dataModelId: data_model.uuid },
          });
        },
        error: (error) => console.error('Error fetching data model:', error),
      });
    }
    this.optionsVisible.set(false);
  }

  deleteDataModel(): void {
    const userConfirmed = window.confirm(
      "Are you sure you want to delete this data model?"
    );
    if (!userConfirmed) {
      return;
    }

    const selectedDataModel = this.selectedDataModelFullname();
    if (selectedDataModel) {
      this.dataModelService.deleteDataModel(selectedDataModel).subscribe({
        next: () => {
          console.log('Data model deleted successfully.');
          this.loadAllDataModels();
        },
        error: (error: any) => console.error('Error deleting data model:', error),
      });
    }
    this.optionsVisible.set(false);
  }


  releaseDataModel(): void {
    const userConfirmed = window.confirm(
      "Are you sure you want to release this data model? " +
      "Once released, you will no longer be able to delete, update, or revert this data model."
    );
    if (!userConfirmed) {
      return;
    }

    const selectedDataModel = this.selectedDataModelFullname();
    if (selectedDataModel) {
      this.dataModelService.releaseDataModel(selectedDataModel).subscribe({
        next: () => {
          console.log('Data model released successfully.');
          this.loadAllDataModels(); // Reload data models after release
        },
        error: (error: any) => console.error('Error releasing data model:', error),
      });
    }
    this.optionsVisible.set(false);
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


  exportDataModel(): void {
    this.toggleOptionsMenu();
    const selectedDataModel = this.selectedDataModelFullname();
    const fileType = this.selectedFileType();

    if (selectedDataModel) {
      this.dataModelService.exportDataModel(selectedDataModel, fileType);
    }
  }
}
