import { Component, OnInit, signal} from '@angular/core';
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Federation } from "../../interfaces/federations.interface";
import { FederationService } from "../../services/federation.service";
import { DataModelService } from "../../services/data-model.service";
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from "../../services/auth.service";
import { MatMenu, MatMenuItem, MatMenuTrigger } from "@angular/material/menu";
import { MatIcon } from "@angular/material/icon";
import { MatIconButton } from "@angular/material/button";
import { DataModel } from "../../interfaces/data-model.interface";
import { FederationSelectorComponent } from "./federation-selector/federation-selector.component";
import { VisualizationComponent } from "./visualization/visualization.component";
import { ActionMenuComponent } from "./action-menu/action-menu.component";
import { NodeInfoComponent } from "./node-info/node-info.component";
import { DataModelSelectorComponent } from "./data-model-selector/data-model-selector.component";
import { ExportOptionsComponent } from "./export-options/export-options.component";

@Component({
  selector: 'app-visualization-wrapper',
  templateUrl: './visualization-wrapper.component.html',
  styleUrls: ['./visualization-wrapper.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatIconButton,
    MatMenuItem,
    FederationSelectorComponent,
    VisualizationComponent,
    ActionMenuComponent,
    NodeInfoComponent,
    DataModelSelectorComponent,
    ExportOptionsComponent
  ],
  standalone: true
})
//TODO:request access for federation
//TODO:filters
export class VisualizationWrapperComponent implements OnInit{
  visualizationType = 'ZoomableCirclePacking';
  d3Data: any;
  federations: Federation[] = [];
  selectedFederation: Federation | null = null;
  selectedDataModel: DataModel | null | undefined;
  selectedNode: any;
  isDomainExpert = false;
  selectedFileType = signal<'json' | 'xlsx'>('json');
  nodeInfoVisible: boolean = true;
  crossSectionalModels: DataModel[] = [];
  longitudinalModels: DataModel[] = [];
  menuVisible = signal(false);


  constructor(
    private federationService: FederationService,
    private dataModelService: DataModelService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}



  ngOnInit(): void {
    // Check for the user's role first
    this.authService.hasRole('DC_DOMAIN_EXPERT').subscribe((hasRole) => {
      this.isDomainExpert = hasRole;
    });

    // Load federations and query params together
    this.federationService.getFederationsWithModels().subscribe({
      next: (federations: Federation[]) => {
        this.federations = federations;

        // Now process the query parameters
        this.route.queryParams.subscribe((params) => {
          const federationCode = params['federationCode'];

          this.selectedFederation = federationCode
            ? this.federations.find((fed) => fed.code === federationCode) || this.federations[0] : this.federations[0];

          this.loadDataModels(); // Only load data models after federations and params are processed
        });
      },
      error: (error) => console.error('Error loading federations:', error),
    });
  }

  loadDataModels(): void {
    if (this.selectedFederation) {

      this.dataModelService.getDataModelsByIds(this.selectedFederation.dataModelIds).subscribe((dataModels) => {

        this.handleDataModelResponse(dataModels);
      });

    } else {
      this.dataModelService.getAllDataModels().subscribe((dataModels) => {
        this.handleDataModelResponse(dataModels);
      });
    }
  }

  handleDataModelResponse(dataModels: DataModel[]): void {
    const { crossSectional, longitudinal } = this.dataModelService.categorizeDataModels(dataModels);
    this.crossSectionalModels = crossSectional;
    this.longitudinalModels = longitudinal;
    if (dataModels.length > 0) {
      this.selectedDataModel = crossSectional[0] || longitudinal[0] || null;
    }
    this.loadVisualizationData();
  }

  loadVisualizationData(): void {
    if (this.selectedDataModel) {
      this.d3Data = this.dataModelService.convertToD3Hierarchy(this.selectedDataModel);
      this.selectedNode = this.d3Data;
    }
  }

  onSelectedNodeChange(node: any): void {
    this.selectedNode = node;
    console.log("this.selectedNode:", this.selectedNode);
  }

  onSelectedDataModelChange(selectedDataModel: DataModel | null): void {
    this.selectedDataModel = selectedDataModel;
    this.loadVisualizationData();
  }

  onSelectedFederationChange(selectedFederation: Federation | null): void {
    this.selectedFederation = selectedFederation;
    this.loadDataModels();
  }

  onNodeInfoVisibilityChange(visible: boolean): void {
    this.nodeInfoVisible = visible;
  }
  handleAction(action: string): void {
    console.log('Action Triggered:', action);
    switch (action) {
      case 'add':
        this.gotoAddOrUpdateDataModel(false);
        break;
      case 'update':
        this.gotoAddOrUpdateDataModel(true);
        break;
      case 'delete':
        this.deleteDataModel();
        break;
      case 'release':
        this.releaseDataModel();
        break;
      default:
        console.error('Unknown action:', action);
    }
  }

  gotoAddOrUpdateDataModel(isUpdate: boolean): void {
    if (isUpdate && this.selectedDataModel) {
      this.router.navigate(['/data-model'], { queryParams: { dataModelId: this.selectedDataModel.uuid } }).then(() => {
      });
    } else {
      this.router.navigate(['/data-model']).then(() => {
      });
    }
  }

  deleteDataModel(): void {
    if (!this.selectedDataModel) {
      console.error('No data model selected to delete.');
      return;
    }

    const userConfirmed = window.confirm(
      'Are you sure you want to delete this data model?'
    );

    if (!userConfirmed) {
      return;
    }

    this.dataModelService.deleteDataModel(this.selectedDataModel.uuid).subscribe({
      next: () => {
        this.dataModelService.getAllDataModels().subscribe((dataModels) => {
          this.handleDataModelResponse(dataModels);
        }); // Reload models after successful deletion
      },
      error: (error) => console.error('Error deleting data model:', error),
    });
  }

  releaseDataModel(): void {
    if (!this.selectedDataModel) {
      console.error('No data model selected to release.');
      return;
    }

    const userConfirmed = window.confirm(
      'Are you sure you want to release this data model? Once released, you will no longer be able to delete, update, or revert this data model.'
    );

    if (!userConfirmed) {
      return;
    }

    this.dataModelService.releaseDataModel(this.selectedDataModel.uuid).subscribe({
      next: () => {
        this.dataModelService.getAllDataModels().subscribe((dataModels) => {
          this.handleDataModelResponse(dataModels);
        }); // Reload models after successful release
      },
      error: (error) => console.error('Error releasing data model:', error),
    });
  }


  exportDataModel(fileType: 'json' | 'xlsx'): void {
    if (this.selectedDataModel) {
      this.dataModelService.exportDataModel(this.selectedDataModel, fileType);
    }
  }

  handleMenuToggle(visible: boolean): void {
    this.menuVisible.set(visible);
  }

}
