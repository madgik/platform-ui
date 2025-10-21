export interface AlgorithmParameter {
  type: 'number' | 'string' | 'boolean' | 'select';
  label: string;
  default?: number | string | boolean;
  required?: boolean;
  options?: string[]; // μόνο για select
  min?: number;
  max?: number;
}

export interface AlgorithmDefinition {
  label: string;
  description?: string;
  category: string;
  requiresY: boolean;
  requiresX: boolean;
  supportsWeights: boolean;
  supportsFilters: boolean;
  configSchema: Record<string, AlgorithmParameter>;
}
