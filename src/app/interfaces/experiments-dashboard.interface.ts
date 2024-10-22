export interface Experiment {
  id: number;
  name: string;
  description: string;
  dateCreated: string;  // Adjust based on your date format
  status: string;
  records: number;
}
