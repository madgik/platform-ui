import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { Experiment } from '../models/experiments-dashboard.model';
import { HttpClient } from '@angular/common/http';
import { BackendExperiment, BackendExperimentWithResult } from '../models/backend-experiment.model';
import { mapBackendToFrontend } from '../pages/experiments-dashboard/experiments-dashboard.mapper';
import { tap } from 'rxjs';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root',
})
export class ExperimentsDashboardService {
  private apiUrl = '/services/experiments';

  // WritableSignal
  experiments: WritableSignal<Experiment[]> = signal<Experiment[]>([]);

  constructor(private http: HttpClient) { }

  private errorService = inject(ErrorService);

  // Fetch all experiments from the backend and update the signal
  getUserExperiments(): void {
    this.http
      .get<{ experiments: BackendExperiment[] }>(this.apiUrl)
      .subscribe({
        next: (response) => {
          if (response?.experiments) {
            const mappedExperiments = response.experiments.map(mapBackendToFrontend);
            this.experiments.set(mappedExperiments);
          } else {
            console.error('Unexpected response format:', response);
            this.experiments.set([]);
            this.errorService.setError('Failed to load experiments.');
          }
        },
        error: (err) => {
          console.error('[ExperimentsDashboardService] getUserExperiments error', err);
          this.errorService.setError('Failed to load experiments.');
          this.experiments.set([]);
        }
      });
  }

  // For edit / hydrate (metadata)
  getExperiment(uuid: string) {
    return this.http.get<BackendExperiment>(`${this.apiUrl}/${uuid}`);
  }

  // For compare / results view
  getExperimentResult(uuid: string) {
    return this.http.get<BackendExperimentWithResult>(`${this.apiUrl}/${uuid}`);
  }

  updateExperimentShared(uuid: string, shared: boolean) {
    return this.http.patch(`/services/experiments/${uuid}`, { shared });
  }

  toggleExperimentShare(experimentId: string, newShared: boolean) {
    return this.http
      .patch<BackendExperiment>(`${this.apiUrl}/${experimentId}`, { shared: newShared })
      .pipe(
        tap((updated) => {
          this.experiments.update((current) =>
            current.map((exp) =>
              exp.id === experimentId
                ? { ...exp, isShared: updated.shared }
                : exp
            )
          );
        })
      );
  }

  updateExperimentName(experimentId: string, name: string) {
    return this.http
      .patch<BackendExperiment>(`${this.apiUrl}/${experimentId}`, { name })
      .pipe(
        tap((updated) => {
          this.experiments.update((current) =>
            current.map((exp) =>
              exp.id === experimentId
                ? { ...exp, name: updated.name }
                : exp
            )
          );
        })
      );
  }

  deleteExperiment(experimentId: string): void {
    if (!experimentId) return;

    // Optimistic update UI
    this.experiments.update((current: Experiment[]) =>
      current.filter((exp: Experiment) => exp.id !== experimentId)
    );

    // Backend call // Todo: show error
    this.http.delete<void>(`${this.apiUrl}/${experimentId}`).subscribe({
      next: () => {
      },
      error: (err) => {
        console.error('Error deleting experiment', err);
      },
    });
  }

}
