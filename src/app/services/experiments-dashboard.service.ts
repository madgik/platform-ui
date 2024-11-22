import { Injectable, signal } from "@angular/core";
import { Experiment } from "../models/experiments-dashboard.model";
import { v4 as uuidv4 } from 'uuid';
import { HttpClient } from "@angular/common/http";
import { BackendExperiment } from "../models/backend-experiment.model";
import { mapBackendToFrontend } from "../pages/experiments-dashboard/experiments-dashboard.mapper";

@Injectable({
  providedIn: 'root',
})
export class ExperimentsDashboardService {

  private apiUrl = 'http://localhost:8080/services/experiments'; // Base URL for backend API

  // Signal to hold the list of experiments
  experiments = signal<Experiment[]>([]);

  constructor(private http: HttpClient) {}

  // Fetch all experiments from the backend and update the signal
  getUserExperiments() {
    this.http.get<{ experiments: BackendExperiment[] }>(this.apiUrl).subscribe((response) => {
      if (response?.experiments) {
        const mappedExperiments = response.experiments.map(mapBackendToFrontend);
        this.experiments.set(mappedExperiments);
      } else {
        console.error('Unexpected response format:', response);
      }
    });
  }

  // Add a new experiment
  addExperiment(newExperiment: Omit<Experiment, 'id'>) {
    const experiment = { ...newExperiment, id: uuidv4() };
    this.experiments.update((current) => [...current, experiment]);
  }

  // Delete an experiment by ID
  deleteExperiment(experimentId: string) {
    this.experiments.update((current) => current.filter(exp => exp.id !== experimentId));
  }
}
