import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VariablesPanelComponent } from './variables-panel/variables-panel.component';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExperimentStudioService } from '../../services/experiment-studio.service';
import { AlgorithmPanelComponent } from './algorithm-panel/algorithm-panel.component';
import { AuthService } from '../../services/auth.service';
import { ExperimentsDashboardService } from '../../services/experiments-dashboard.service';
import { SpinnerComponent } from '../shared/spinner/spinner.component';
import { ErrorService } from '../../services/error.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-experiment-studio',
  standalone: true,
  imports: [
    CommonModule,
    VariablesPanelComponent,
    AlgorithmPanelComponent,
    FormsModule,
    SpinnerComponent
  ],
  templateUrl: './experiment-studio.component.html',
  styleUrls: ['./experiment-studio.component.css'],
})
export class ExperimentStudioComponent implements OnInit, OnDestroy {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dashboardService: ExperimentsDashboardService,
    public auth: AuthService,
    private errorService: ErrorService
  ) { }

  // private service via inject
  private expStudioService = inject(ExperimentStudioService);
  readonly isRunning = this.expStudioService.isRunning;
  private destroy$ = new Subject<void>();
  errorMessage = '';

  ngOnInit(): void {
    // Reset any lingering global errors when arriving on the studio
    this.errorService.clearError();

    this.errorService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => this.errorMessage = msg ?? '');

    this.route.queryParamMap.subscribe((params) => {
      const experimentId = params.get('experimentId');
      const mode = params.get('mode');

      if (mode === 'edit' && experimentId) {
        // EDIT MODE
        this.loadExperimentForEdit(experimentId);
      } else {
        // CREATE MODE
        this.initCreateMode();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  dismissError(): void {
    this.errorService.clearError();
    this.errorMessage = '';
  }

  // Clean create mode. resets all of the studio's state
  private initCreateMode(): void {
    // Reset service state (variables, datasets, filters, algo)
    this.expStudioService.resetStudioState();

    this.expStudioService.setExperimentName('');
    this.expStudioService.setExperimentDescription('');
    this.expStudioService.setEditingExistingExperiment(false);
  }

  private loadExperimentForEdit(uuid: string): void {
    this.dashboardService.getExperiment(uuid).subscribe({
      next: (backendExp) => {
        // Prefill Experiment Studio (datasets, domain, variables, filters, algo, params)
        this.expStudioService.hydrateFromBackendExperiment(backendExp);
      },
      error: (err) => {
        console.error('Failed to load experiment for edit:', err);
        // fallback turns to create mode if something goes wrong
        this.initCreateMode();
      },
    });
  }

  onBackToDashboard(): void {
    // If an experiment is running, ignore the click
    if (this.isRunning()) {
      return;
    }

    // Clean up experiment studio state
    this.expStudioService.resetStudioState();
    this.expStudioService.setEditingExistingExperiment(false);
    this.expStudioService.setExperimentName('');
    this.expStudioService.setExperimentDescription('');
    this.errorService.clearError();

    // Go to experiments dashboard
    this.router.navigate(['/experiments-dashboard']);
  }

}
