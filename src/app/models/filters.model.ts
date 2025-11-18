export type BackendRule = {
  id: string;
  field: string;
  type: 'string' | 'integer' | 'real';   // προσοχή: το backend θέλει "string", όχι "nominal"
  input: 'text' | 'number' | 'select';
  operator: string;
  value: any;
};

export type BackendFilter = {
  condition: 'AND' | 'OR';
  rules: BackendRule[];
  valid?: boolean;
};
