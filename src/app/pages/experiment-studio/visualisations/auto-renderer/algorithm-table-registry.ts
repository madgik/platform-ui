export interface TableSpec {
  title?: string;
  columns: string[];
  rows: any[][];
}

export type TableBuilder = (result: any) => TableSpec[];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDecimal(value: any): string | number {
  if (typeof value !== 'number') return value ?? '';
  const rounded = Number(value.toFixed(3));
  return Number.isInteger(rounded) ? Math.round(rounded) : rounded;
}


export const AlgorithmTableRegistry: Record<string, TableBuilder> = {
  kmeans: (result) => {
    const centers = result?.centers;
    if (!Array.isArray(centers)) return [];
    const dims = centers[0]?.length || 0;
    const columns = [...Array(dims)].map((_, i) => ['x', 'y', 'z'][i] || `dim${i + 1}`);
    const rows = centers.map((row: number[]) => row.map(v => Number(v.toFixed(3))));
    return [{ title: 'K-Means Centers', columns, rows }];
  },

  linear_regression: (result) => {
    const coefTable = result?.coefficients;
    const infoTable = result?.model_info;

    if (!coefTable || !infoTable) return [];

    const coefRows = Object.entries(coefTable).map(([variable, stats]: [string, any]) => [
      variable,
      stats.coefficient,
      stats.std_err,
      stats.z_score,
      stats.p_value,
      stats.ci_lower,
      stats.ci_upper,
    ]);

    const infoRows = Object.entries(infoTable).map(([key, value]) => [key, value]);

    return [
      {
        title: 'Coefficients',
        columns: ['Independent variables', 'Coefficients', 'Std.Err.', 'z-scores', 'P(>|z|)', 'Lower 95% c.i.', 'Upper 95% c.i.'],
        rows: coefRows,
      },
      {
        title: 'Model Info',
        columns: ['Name', 'Value'],
        rows: infoRows,
      },
    ];
  },

  linear_regression_cv: (result) => {
    if (!result) return [];

    const n_obs = result?.n_obs || [];
    const sampleSizeRows = n_obs.map((val: number, i: number) => [
      `Fold ${i + 1}`, val
    ]);

    const summary = [
      ['Root mean squared error', result?.mean_sq_error_avg, result?.mean_sq_error_std],
      ['R-squared', result?.r_squared_avg, result?.r_squared_std],
      ['Mean absolute error', result?.mean_abs_error_avg, result?.mean_abs_error_std],
    ];

    return [
      {
        title: 'Training set sample sizes',
        columns: ['Fold', 'Training set sample sizes'],
        rows: sampleSizeRows
      },
      {
        title: '',
        columns: ['Mean', 'Standard deviation'],
        rows: summary.map(([label, mean, std]) => [label, mean, std])
      }
    ];
  },


  pearson_correlation: (result) => {
    const rows = result?.correlations;
    if (!Array.isArray(rows)) return [];
    const columns = ['Variable 1', 'Variable 2', 'Correlation', 'P value', 'Low CI', 'High CI'];
    return [{ title: 'Pearson Correlations', columns, rows }];
  },

  naive_bayes_gaussian_cv: (result) => {
    const summary = result?.classification_summary;
    if (!summary) return [];

    const metrics = ['accuracy', 'precision', 'recall', 'fscore'];
    const classes = Object.keys(summary.accuracy); // π.χ. F, M
    const folds = Object.keys(summary.accuracy[classes[0]]).filter(k => k !== 'average' && k !== 'stdev');

    const rows = [...folds, 'average', 'stdev'].map(fold => {
      const row: any[] = [fold];
      for (const metric of metrics) {
        for (const cls of classes) {
          row.push(formatDecimal(summary[metric][cls]?.[fold]));
        }
      }
      row.push(formatDecimal(summary.n_obs?.[fold]));
      return row;
    });

    const columns = ['Fold'];
    for (const metric of metrics) {
      for (const cls of classes) {
        const name = `${metric.charAt(0).toUpperCase() + metric.slice(1)} (${cls})`;
        columns.push(name);
      }
    }
    columns.push('Number of observations');

    return [
      {
        title: 'Classification Metrics per Fold',
        columns,
        rows,
      },
    ];
  },

  logistic_regression: (result) => {
    const coef = result?.coefficients;
    const modelStats = result?.model_statistics;
    if (!coef || !modelStats) return [];

    const coefColumns = Object.keys(coef[0]);
    const coefRows = coef.map((c: any) => coefColumns.map(col => c[col]));

    const statColumns = ['Name', 'Value'];
    const statRows = Object.entries(modelStats);

    return [
      { title: 'Logistic Regression Coefficients', columns: coefColumns, rows: coefRows },
      { title: 'Model Statistics', columns: statColumns, rows: statRows },
    ];
  },

  logistic_regression_cv: (result) => {
    const metrics = result?.metrics;
    if (!Array.isArray(metrics)) return [];
    const columns = Object.keys(metrics[0]);
    const rows = metrics.map((m: any) => columns.map(col => m[col]));
    return [{ title: 'Logistic Regression CV Metrics', columns, rows }];
  },

  naive_bayes_categorical_cv: (result) => {
    const metrics = result?.metrics;
    if (!Array.isArray(metrics)) return [];
    const columns = Object.keys(metrics[0]);
    const rows = metrics.map((m: any) => columns.map(col => m[col]));
    return [{ title: 'Categorical Naive Bayes CV Metrics', columns, rows }];
  },

  anova_oneway: (result) => {
    const table = result?.anova_table;
    const comparisons = result?.tuckey_test;
    const formatP = (val: any) => {
      if (typeof val !== 'number') return val ?? '';
      return val.toFixed(3);
    };


    if (!table || !comparisons) return [];

    const summaryData = [
      {
        label: table.x_label ?? 'Factor',
        df: table.df_explained,
        ss: table.ss_explained,
        ms: table.ms_explained,
        f: table.f_stat,
        p: table.p_value
      },
      {
        label: 'Residual',
        df: table.df_residual,
        ss: table.ss_residual,
        ms: table.ms_residual,
        f: table.f_residual, // optional
        p: table.p_residual  // optional
      }
    ];

    const summaryCols = ['Source', 'DF', 'SS', 'MS', 'F ratio', 'P value'];
    const summaryRows = summaryData.map((row) => [
      row.label,
      formatDecimal(row.df),
      formatDecimal(row.ss),
      formatDecimal(row.ms),
      formatDecimal(row.f),
      formatP(row.p)
    ]);

    const compCols = Object.keys(comparisons[0]);
    const compRows = comparisons.map((r: any) =>
      compCols.map(c => formatDecimal(r[c]))
    );

    return [
      {
        title: 'ANOVA Summary',
        columns: summaryCols,
        rows: summaryRows
      },
      {
        title: 'Pairwise Comparisons',
        columns: compCols,
        rows: compRows
      }
    ];
  },

  anova_twoway: (result) => {
    const rows = result?.table;
    if (!Array.isArray(rows)) return [];
    const columns = Object.keys(rows[0]);
    return [{ title: 'Two-Way ANOVA Results', columns, rows: rows.map((r: any) => columns.map(c => r[c])) }];
  },

  ttest_onesample: (result) => {
    if (!result || typeof result !== 'object') return [];
    const rows = Object.entries(result);
    return [
      {
        title: 'One-Sample T-Test',
        columns: ['name', 'value'],
        rows,
      }
    ];
  },
  ttest_independent: (result) => {
    if (!result || typeof result !== 'object') return [];
    const rows = Object.entries(result);
    return [
      {
        title: 'Independent T-Test',
        columns: ['name', 'value'],
        rows,
      }
    ];
  },
  ttest_paired: (result) => {
    if (!result || typeof result !== 'object') return [];
    const rows = Object.entries(result);
    return [
      {
        title: 'Paired T-Test',
        columns: ['name', 'value'],
        rows,
      }
    ];
  },

  default: () => [],
};
