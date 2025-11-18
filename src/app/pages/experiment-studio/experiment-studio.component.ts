import { BubbleData } from './../../models/experiment-studio.model';
import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VariablesPanelComponent } from './variables-panel/variables-panel.component';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExperimentStudioService } from '../../services/experiment-studio.service';
import { AlgorithmPanelComponent } from './algorithm-panel/algorithm-panel.component';
import { LoginModalComponent } from '../login-page/login-modal.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-experiment-studio',
  standalone: true,
  imports: [CommonModule,
            VariablesPanelComponent,
            AlgorithmPanelComponent,
            FormsModule,
            LoginModalComponent],
  templateUrl: './experiment-studio.component.html',
  styleUrls: ['./experiment-studio.component.css'],
})
export class ExperimentStudioComponent {

  experimentName: string | null = null;
  experimentDate: string | null = null;
  experimentDescription: string | null = null;
  selectedVariableData: any = null;

  constructor(private route: ActivatedRoute, private expStudioService: ExperimentStudioService, public auth: AuthService) { }

  ngOnInit(): void {
    // Retrieve query parameters
    this.route.queryParams.subscribe((params) => {
      this.experimentName = params['name'] || 'Untitled Experiment';
      this.experimentDate = params['date'] || new Date().toISOString();
      this.experimentDescription = params['description'] || '';
    });
  }

  onVariableSelected(variable: BubbleData): void {
    const algorithmName = "multiple_histograms";
    this.expStudioService.getAlgorithmResults(algorithmName, [variable.code]).subscribe(
      (response) => {
        this.selectedVariableData = response?.output?.histogram || null;
      },
      (error) => {
        console.error("Error fetching variable distribution data:", error);
      }
    )
  }
}
