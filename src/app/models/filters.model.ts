export type BackendRule = {
  id: string;
  field: string;
  type: 'string' | 'integer' | 'real';
  input: 'text' | 'number' | 'select';
  operator: string;
  value: any;
};

export type BackendFilter = {
  condition: 'AND' | 'OR';
  rules: BackendRule[];
  valid?: boolean;
};
