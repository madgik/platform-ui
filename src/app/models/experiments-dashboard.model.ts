export interface Experiment {
  id: string;
  name: string;
  dateCreated: Date;
  description?: string;
  status: string;
}

export interface AlgorithmDetails {
  name: string;
  type: string;
  datasets: string[];
  parameters: Record<string, unknown>;
  dataModel: string;
}

export interface UserDetails {
  username: string;
  fullname: string;
  email: string;
}
