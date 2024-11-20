// backend-experiment.interface.ts
export interface BackendExperiment {
  uuid: string;
  name: string;
  created: string;
  finished: string;
  shared: boolean;
  viewed: boolean;
  status: string;
  algorithm: {
    name: string;
    inputdata: {
      data_model: string;
      datasets: string[];
      y: string[];
    };
    parameters: Record<string, unknown>;
    type: string;
  };
  createdBy: {
    username: string;
    fullname: string;
    email: string;
    subjectId: string;
    agreeNDA: boolean;
  };
}
