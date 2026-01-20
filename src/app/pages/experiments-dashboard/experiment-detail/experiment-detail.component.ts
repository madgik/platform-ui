import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { input, computed, effect, signal } from '@angular/core';
import { ExperimentsDashboardService } from '../../../services/experiments-dashboard.service';
import { Experiment } from '../../../models/experiments-dashboard.model';
import { BackendExperimentWithResult } from '../../../models/backend-experiment.model';
import { AlgorithmResultComponent } from '../../experiment-studio/algorithm-panel/algorithm-result/algorithm-result.component';
import { getOutputSchema } from '../../../core/algorithm-mappers';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';
import { PdfExportService } from '../../../services/export-results-pdf.service';
import { Router } from '@angular/router';
import { ExperimentLabelService } from '../../../services/experiment-label.service';

@Component({
  selector: 'app-experiment-details',
  standalone: true,
  templateUrl: './experiment-detail.component.html',
  styleUrls: ['./experiment-detail.component.css'],
  imports: [CommonModule, AlgorithmResultComponent, SpinnerComponent],
})
export class ExperimentDetailsComponent {
  selectedExperiment = input<Experiment | null>(null);

  @Output() run = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() deleteExperiment = new EventEmitter<void>();

  @ViewChild('resultsCard') resultsCardRef?: ElementRef<HTMLElement>;

  private resultSignal = signal<any | null>(null);
  private fullExperimentSignal = signal<BackendExperimentWithResult | null>(null);
  private loading = signal(false);
  private error = signal<string | null>(null);

  readonly experimentResult = this.resultSignal.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly loadError = this.error.asReadonly();
  readonly isShared = signal<boolean>(false);

  readonly copyToastVisible = signal<boolean>(false);
  readonly copyToastMessage = signal<string>('Link copied to clipboard');

  private codeToLabelSignal = signal<Record<string, string>>({});

  readonly experimentalAlgorithmName = computed(
    () => this.selectedExperiment()?.algorithmName ?? ''
  );

  readonly outputSchema = computed(
    () => getOutputSchema(this.experimentalAlgorithmName()) ?? []
  );

  constructor(
    private dashboardService: ExperimentsDashboardService,
    private pdfExport: PdfExportService,
    private router: Router,
    private labelService: ExperimentLabelService
  ) {
    // sync isShared with selectedExperiment
    effect(
      () => {
        const exp = this.selectedExperiment();
        this.isShared.set(!!exp?.isShared);
      },
      { allowSignalWrites: true }
    );

    // Load results for selected experiment
    effect(
      () => {
        const exp = this.selectedExperiment();

        if (!exp?.id) {
          this.resultSignal.set(null);
          this.loading.set(false);
          this.error.set(null);
          return;
        }

        this.fetchResult(exp.id);
      },
      { allowSignalWrites: true }
    );

    // Load label map for domain (cached by service)
    effect(
      () => {
        const domain = this.selectedExperiment()?.domain ?? null;
        this.loadLabels(domain);
      },
      { allowSignalWrites: true }
    );
  }

  private loadedDomain = signal<string | null>(null);

  private async loadLabels(domain: string | null) {
    if (!domain) {
      this.codeToLabelSignal.set({});
      this.loadedDomain.set(null);
      return;
    }

    if (this.loadedDomain() === domain && Object.keys(this.codeToLabelSignal()).length > 0) return;

    const map = await this.labelService.getLabelMap(domain);
    this.codeToLabelSignal.set(map);
    this.loadedDomain.set(domain);
  }

  private showCopyToast(message = 'Link copied to clipboard') {
    this.copyToastMessage.set(message);
    this.copyToastVisible.set(true);

    setTimeout(() => {
      this.copyToastVisible.set(false);
    }, 2400);
  }

  private fetchResult(uuid: string) {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getExperimentResult(uuid).subscribe({
      next: (res) => {
        this.fullExperimentSignal.set(res ?? null);
        const normalized = res?.result ?? res;
        this.resultSignal.set(normalized);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading experiment result', err);
        this.error.set('Failed to load results for this experiment.');
        this.loading.set(false);
      },
    });
  }

  private withLabels(codes: string[] | undefined | null) {
    const map = this.codeToLabelSignal();
    return (codes ?? []).map((code) => ({ code, label: map[code] ?? code }));
  }

  readonly variablesWithLabels = computed(() =>
    this.withLabels(this.selectedExperiment()?.variables)
  );

  readonly covariatesWithLabels = computed(() =>
    this.withLabels(this.selectedExperiment()?.covariates)
  );

  readonly filtersWithLabels = computed(() =>
    this.withLabels(this.selectedExperiment()?.filters)
  );

  onExportPdf(): void {
    const element = this.resultsCardRef?.nativeElement;
    const result = this.experimentResult();
    const fullExperiment = this.fullExperimentSignal();

    if (!element || !result) {
      console.warn('No result or element to export');
      return;
    }

    const baseName = this.selectedExperiment()?.name?.trim() || 'experiment results';
    const filename = baseName.replace(/\s+/g, '_');

    this.pdfExport.exportExperimentPdf({
      filename,
      details: {
        experimentName: baseName,
        createdBy: this.selectedExperiment()?.author ?? null,
        createdAt: this.selectedExperiment()?.dateCreated ?? null,
        algorithm: fullExperiment?.algorithm?.name ?? this.experimentalAlgorithmName(),
        params: fullExperiment?.algorithm?.parameters ?? null,
        preprocessing: 'none',
        domain: this.selectedExperiment()?.domain ?? null,
        datasets: this.selectedExperiment()?.datasets ?? [],
        variables: this.variablesWithLabels().map((v) => v.label),
        covariates: this.covariatesWithLabels().map((c) => c.label),
        filters: this.filtersWithLabels().map((f) => f.label),
      },
      algorithmKey: fullExperiment?.algorithm?.name ?? this.experimentalAlgorithmName(),
      result,
      chartContainer: element,
    });
  }

  runExperiment() {
    const id = this.selectedExperiment()?.id;
    if (!id) return;
    this.run.emit(id);
  }

  editExperiment() {
    const id = this.selectedExperiment()?.id;
    if (!id) return;
    this.edit.emit(id);
  }

  onToggleShare(): void {
    const exp = this.selectedExperiment();
    if (!exp) return;

    const newShared = !this.isShared();

    this.dashboardService.toggleExperimentShare(exp.id, newShared).subscribe({
      next: () => {
        this.isShared.set(newShared);

        if (newShared) {
          const url = this.buildShareUrl(exp.id);

          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(
              () => this.showCopyToast('Link copied to clipboard'),
              (err) => {
                console.warn('Failed to copy share URL:', err);
                this.showCopyToast('Could not copy link — check console.');
              }
            );
          } else {
            console.warn('Clipboard API not available, share URL:', url);
            this.showCopyToast('Clipboard not available — check console log.');
          }
        }
      },
      error: (err) => {
        console.error('Failed to toggle share:', err);
        this.showCopyToast('Failed to update share state');
      },
    });
  }

  private buildShareUrl(expId: string): string {
    const tree = this.router.createUrlTree(['/experiments-dashboard'], {
      queryParams: { experiment: expId },
    });

    const relative = this.router.serializeUrl(tree);
    const origin = window.location.origin;
    return origin + relative;
  }

  onDelete() {
    this.deleteExperiment.emit();
  }
}
