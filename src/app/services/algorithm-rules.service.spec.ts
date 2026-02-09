import { AlgorithmRoles } from '../core/constants/algorithm.constants';
import { AlgorithmConfig } from '../models/algorithm-definition.model';
import { AlgorithmRulesService } from './algorithm-rules.service';

describe('AlgorithmRulesService', () => {
  let service: AlgorithmRulesService;

  beforeEach(() => {
    service = new AlgorithmRulesService();
  });

  it('does not disable an algorithm when a filter variable is selected and filter types are payload metadata', () => {
    const algo = {
      name: 'mock_algo',
      label: 'Mock Algo',
      description: '',
      requiredVariable: [],
      covariate: [],
      category: 'Mock',
      configSchema: [],
      type: 'exareme2',
      isDisabled: false,
      inputdata: {
        data_model: { label: 'data_model', desc: '', types: ['text'], notblank: true, multiple: false },
        datasets: { label: 'datasets', desc: '', types: ['text'], notblank: true, multiple: true },
        y: { label: 'y', desc: '', types: ['real'], notblank: true, multiple: false },
        x: { label: 'x', desc: '', types: ['real'], notblank: false, multiple: true },
        filter: { label: 'filter', desc: '', types: ['json'], notblank: false, multiple: true },
      },
    } as AlgorithmConfig;

    const available = service.isAlgorithmAvailable(algo, {
      y: [{ code: 'v1', label: 'var1', type: 'real' } as any],
      x: [],
      filters: [{ code: 'f1', label: 'filter1', type: 'real' } as any],
    });

    expect(available).toBeTrue();
  });

  it('still enforces required filter presence when notblank is true', () => {
    const algo = {
      name: 'mock_algo',
      label: 'Mock Algo',
      description: '',
      requiredVariable: [],
      covariate: [],
      category: 'Mock',
      configSchema: [],
      type: 'exareme2',
      isDisabled: false,
      inputdata: {
        data_model: { label: 'data_model', desc: '', types: ['text'], notblank: true, multiple: false },
        datasets: { label: 'datasets', desc: '', types: ['text'], notblank: true, multiple: true },
        y: { label: 'y', desc: '', types: ['real'], notblank: true, multiple: false },
        [AlgorithmRoles.FILTER]: { label: 'filter', desc: '', types: ['json'], notblank: true, multiple: true },
      },
    } as AlgorithmConfig;

    const available = service.isAlgorithmAvailable(algo, {
      y: [{ code: 'v1', label: 'var1', type: 'real' } as any],
      x: [],
      filters: [],
    });

    expect(available).toBeFalse();
  });
});
