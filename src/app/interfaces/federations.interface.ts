import {DataModel} from "./data-model.interface";

export interface Federation {
  code: string;
  title: string;
  url: string;
  description: string;
  dataModelIds: string[];
  dataModels: DataModel[];
  institutions: string;
  records: string;
}
