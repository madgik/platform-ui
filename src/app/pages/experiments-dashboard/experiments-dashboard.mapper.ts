// experiments.mapper.ts
import { BackendExperiment } from "../../models/backend-experiment.model";
import { Experiment, AlgorithmDetails, UserDetails } from './../../models/experiments-dashboard.model';

// Map BackendExperiment to Experiment
export function mapBackendToFrontend(backend: BackendExperiment): Experiment {
  return {
    id: backend.uuid,
    name: backend.name,
    dateCreated: new Date(backend.created),
    description: backend.algorithm?.name || '', // Optionally include algorithm name as description
    status: backend.status,
  };
}

// Map BackendExperiment to AlgorithmDetails
export function mapBackendToAlgorithmDetails(backend: BackendExperiment): AlgorithmDetails {
  return {
    name: backend.algorithm.name,
    type: backend.algorithm.type,
    datasets: backend.algorithm.inputdata.datasets,
    parameters: backend.algorithm.parameters,
    dataModel: backend.algorithm.inputdata.data_model,
  };
}

// Map BackendExperiment to UserDetails
export function mapBackendToUserDetails(backend: BackendExperiment): UserDetails {
  return {
    username: backend.createdBy.username,
    fullname: backend.createdBy.fullname,
    email: backend.createdBy.email,
  };
}

// Map Experiment to BackendExperiment (Frontend to Backend)
export function mapFrontendToBackend(frontend: Experiment): Partial<BackendExperiment> {
  return {
    uuid: frontend.id,
    name: frontend.name,
    created: frontend.dateCreated.toISOString(),
    status: frontend.status,
  };
}
