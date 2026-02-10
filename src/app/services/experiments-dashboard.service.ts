import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { Experiment } from '../models/experiments-dashboard.model';
import { HttpClient } from '@angular/common/http';
import { BackendExperiment, BackendExperimentWithResult } from '../models/backend-experiment.model';
import { mapBackendToFrontend } from '../pages/experiments-dashboard/experiments-dashboard.mapper';
import { map, tap } from 'rxjs';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root',
})
export class ExperimentsDashboardService {
  private apiUrl = '/services/experiments';

  // WritableSignal
  experiments: WritableSignal<Experiment[]> = signal<Experiment[]>([]);
  totalExperiments = signal<number>(0);
  globalTotalExperiments = signal<number>(0);
  totalPages = signal<number>(0);
  currentPage = signal<number>(0);

  private http = inject(HttpClient);

  constructor() { }

  private errorService = inject(ErrorService);

  // Fetch all experiments from the backend and update the signal
  getUserExperiments(page: number = 0, size: number = 10, onlyMine: boolean = false, filters?: any): void {
    const params: any = {
      page: page.toString(),
      size: size.toString(),
      mine: onlyMine,
      includeShared: (!onlyMine).toString()
    };
    console.log('getUserExperiments params:', params);

    if (filters) {
      if (filters.query) params.name = filters.query;
      if (filters.algorithm) params.algorithm = filters.algorithm;
      if (filters.shared === 'shared') params.shared = 'true';
      if (filters.shared === 'private') params.shared = 'false';
    }

    this.http
      .get<{ experiments: BackendExperiment[], totalExperiments: number, totalPages: number, currentPage: number }>(this.apiUrl, {
        params: params
      })
      .subscribe({
        next: (response) => {
          const mappedExperiments = (response?.experiments || []).map(mapBackendToFrontend);
          this.experiments.set(mappedExperiments);
          this.totalExperiments.set(response?.totalExperiments || 0);
          this.totalPages.set(response?.totalPages || 0);
          this.currentPage.set(response?.currentPage || 0);
        },
        error: (err) => {
          console.error('[ExperimentsDashboardService] getUserExperiments error', err);
          this.errorService.setError('Failed to load experiments.');
          this.experiments.set([]);
        }
      });
  }

  fetchGlobalTotal(): void {
    const params = {
      page: '0',
      size: '1',
      mine: 'false',
      includeShared: 'true'
    };
    this.http
      .get<{ experiments: BackendExperiment[], totalExperiments: number, totalPages: number, currentPage: number }>(this.apiUrl, {
        params: params
      })
      .subscribe({
        next: (response) => {
          this.globalTotalExperiments.set(response?.totalExperiments || 0);
        },
        error: (err) => {
          console.error('[ExperimentsDashboardService] fetchGlobalTotal error', err);
        }
      });
  }

  // For edit / hydrate (metadata)
  getExperiment(uuid: string) {
    return this.http.get<BackendExperiment>(`${this.apiUrl}/${uuid}`);
  }

  fetchExperimentById(uuid: string) {
    return this.http
      .get<BackendExperiment>(`${this.apiUrl}/${uuid}`)
      .pipe(map(mapBackendToFrontend));
  }

  upsertExperiment(experiment: Experiment): void {
    if (!experiment?.id) return;
    this.experiments.update((current) => {
      const idx = current.findIndex((exp) => exp.id === experiment.id);
      if (idx === -1) {
        return [experiment, ...current];
      }
      const next = [...current];
      next[idx] = { ...current[idx], ...experiment };
      return next;
    });
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
