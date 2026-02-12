import { AlgorithmChartRegistry } from './chart-registry';

describe('AlgorithmChartRegistry', () => {
  it('contains canonical and legacy SVM keys', () => {
    expect(AlgorithmChartRegistry['linear_svm']).toBeDefined();
    expect(AlgorithmChartRegistry['svm_scikit']).toBeDefined();
  });

  it('renders chart options for linear_svm payload shape', () => {
    const charts = AlgorithmChartRegistry['linear_svm'].build({
      title: 'Federated Linear SVM (Averaged Parameters)',
      weights: [0.11, -0.2, 0.35, 0.02],
      intercept: 0.44,
    });

    expect(charts.length).toBe(1);
    expect((charts[0] as any).title?.text).toBe('SVM Support Vector Distribution');
  });

  it('keeps legacy svm_scikit behavior equivalent to linear_svm', () => {
    const payload = {
      support_vectors: [0.2, 0.3, 0.5, 0.8, 1.2],
      coeff: [0.7],
    };

    const canonical = AlgorithmChartRegistry['linear_svm'].build(payload);
    const legacy = AlgorithmChartRegistry['svm_scikit'].build(payload);

    expect(canonical).toEqual(legacy);
  });
});
