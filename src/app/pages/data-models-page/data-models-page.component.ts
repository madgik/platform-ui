import { Component, OnDestroy, OnInit, signal} from '@angular/core';
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Federation } from "../../interfaces/federations.interface";
import { FederationService } from "../../services/federation.service";
import { DataModelService } from "../../services/data-model.service";
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import { AuthService } from "../../services/auth.service";
import { MatMenu, MatMenuItem, MatMenuTrigger } from "@angular/material/menu";
import { MatIcon } from "@angular/material/icon";
import { MatIconButton } from "@angular/material/button";
import { DataModel } from '../../models/data-model.interface';
import { FederationSelectorComponent } from "./federation-selector/federation-selector.component";
import { VisualizationComponent } from "./visualization/visualization.component";
import { ActionMenuComponent } from "./action-menu/action-menu.component";
import { NodeInfoComponent } from "./node-info/node-info.component";
import { DataModelSelectorComponent } from "../experiment-studio/variables-panel/data-model-selector/data-model-selector.component";
import { ExportOptionsComponent } from "./export-options/export-options.component";
import {ErrorService} from "./services/error.service";
import {ConfirmationDialogComponent} from "./confirmation-dialog/confirmation-dialog.component";
import {MatDialog} from "@angular/material/dialog";
import {DataModelFormComponent} from "./data-model-form/data-model-form.component";
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'app-data-models-page',
  templateUrl: './data-models-page.component.html',
  styleUrls: ['./data-models-page.component.css'],
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
    ExportOptionsComponent,
    RouterOutlet
  ],
  standalone: true
})
//TODO:request access for federation
//TODO:filters
export class DataModelsPageComponent implements OnInit, OnDestroy {
  visualizationType = 'TidyTree';
  d3Data: any;
  federations: Federation[] = [];
  selectedFederation: Federation | null = null;
  selectedDataModel: DataModel | null | undefined;
  selectedNode: any;
  isAuthenticated = false;
  selectedFileType = signal<'json' | 'xlsx'>('json');
  nodeInfoVisible: boolean = true;
  crossSectionalModels: DataModel[] = [];
  longitudinalModels: DataModel[] = [];
  menuVisible = signal(false);


  private destroy$ = new Subject<void>();

  constructor(
    private federationService: FederationService,
    private dataModelService: DataModelService,
    private authService: AuthService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}



  ngOnInit(): void {
    // Track authentication state to toggle UI affordances
    this.authService.initialize();
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated) => {
        this.isAuthenticated = isAuthenticated;
      });

    // Load federations and query params together
    this.federationService.getFederationsWithModels().subscribe({
      next: (federations: Federation[]) => {
        this.federations = federations;

        // Now process the query parameters
        this.route.queryParams.subscribe((params) => {
          const federationCode = params['federationCode'];

          // Set selectedFederation based on federationCode
          this.selectedFederation = federationCode
            ? this.federations.find((fed) => fed.code === federationCode) || null
            : null;
        });
        this.loadDataModels()
      },
      error: (error) => {
        console.error('Error loading federations:', error);
        this.errorService.setError('Failed to load federations.');
      },
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    switch (action) {
      case 'add':
        this.goToAddDataModel();
        break;
      case 'update':
        this.goToUpdateDataModel();
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

  goToAddDataModel(): void {
    const dialogRef = this.dialog.open(DataModelFormComponent, {
      data: { isUpdateMode: false }, // Pass props for add mode
    });

    dialogRef.componentInstance.dataModelUpdated.subscribe(() => {
      this.onDataModelUpdated(); // Refresh data models after adding
      dialogRef.close(); // Close the dialog after the operation
    });
  }

  goToUpdateDataModel(): void {
    if (this.selectedDataModel) {
      const dialogRef = this.dialog.open(DataModelFormComponent, {
        data: {
          isUpdateMode: true,
          dataModelId: this.selectedDataModel.uuid, // Pass the current data model's ID for update mode
        },
      });

      dialogRef.componentInstance.dataModelUpdated.subscribe(() => {
        this.onDataModelUpdated(); // Refresh data models after updating
        dialogRef.close(); // Close the dialog after the operation
      });
    }
  }

  onDataModelUpdated(): void {
    this.loadDataModels();
  }


  // Check if the current route is a child route
  isChildRouteActive(): boolean {
    const currentPath = this.router.url;
    return currentPath.includes('/data-models/add') || currentPath.includes('/data-models/update');
  }

  deleteDataModel(): void {
    if (!this.selectedDataModel) { // Ensure selectedDataModel is defined
      console.error('No data model selected to delete.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete DataModel',
        message: 'Are you sure you want to delete this data model? This action cannot be undone.'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const uuid = this.selectedDataModel?.uuid; // Safe optional chaining for uuid
        if (uuid) { // Ensure uuid exists
          this.dataModelService.deleteDataModel(uuid).subscribe({
            next: () => {
              this.dataModelService.getAllDataModels().subscribe((dataModels) => {
                this.handleDataModelResponse(dataModels);
              }); // Reload models after successful deletion
            },
            error: (error) => console.error('Error deleting data model:', error),
          });
        } else {
          console.error('Selected data model does not have a valid UUID.');
        }
      }
    });
  }

  releaseDataModel(): void {
    if (!this.selectedDataModel) { // Ensure selectedDataModel is defined
      console.error('No data model selected to release.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Release DataModel',
        message: 'Are you sure you want to release this data model? Once released, you will no longer be able to delete, update, or revert this data model.'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const uuid = this.selectedDataModel?.uuid; // Safe optional chaining for uuid
        if (uuid) { // Ensure uuid exists
          this.dataModelService.releaseDataModel(uuid).subscribe({
            next: () => {
              this.dataModelService.getAllDataModels().subscribe((dataModels) => {
                this.handleDataModelResponse(dataModels);
              }); // Reload models after successful release
            },
            error: (error) => console.error('Error releasing data model:', error),
          });
        } else {
          console.error('Selected data model does not have a valid UUID.');
        }
      }
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
