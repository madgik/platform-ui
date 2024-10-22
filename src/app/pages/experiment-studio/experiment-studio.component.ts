import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { WorkflowComponent } from './workflow/workflow.component';
import { VariablesPanelComponent } from './variables-panel/variables-panel.component';
import { TransformationsPanelComponent } from './transformations-panel/transformations-panel.component';
import { FiltersPanelComponent } from './filters-panel/filters-panel.component';
import { AlgorithmPanelComponent } from './algorithm-panel/algorithm-panel.component';
import { ResultsPanelComponent } from './results-panel/results-panel.component';
import { StatisticAnalysisPanelComponent } from './statistic-analysis-panel/statistic-analysis-panel.component';

@Component({
  selector: 'app-experiment-studio',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    WorkflowComponent,
    VariablesPanelComponent,
    TransformationsPanelComponent,
    FiltersPanelComponent,
    AlgorithmPanelComponent,
    ResultsPanelComponent,
    StatisticAnalysisPanelComponent
  ],
  templateUrl: './experiment-studio.component.html',
  styleUrls: ['./experiment-studio.component.css']
})
export class ExperimentStudioComponent {
  currentStep: number = 1;
  variableName: string = '';
  transformationName: string = '';
  filterName: string = '';

  onVariableSelected(variable: string) {
    this.variableName = variable;
    this.currentStep = 2; // Move to the next step after variable selection
  }

  onAlgorithmConfigured(algorithm: string) {
    console.log(`Algorithm Configured: ${algorithm}`);
  }
}
