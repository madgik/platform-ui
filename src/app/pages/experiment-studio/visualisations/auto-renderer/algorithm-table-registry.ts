export interface TableSpec {
  title?: string;
  columns: string[];
  rows: any[][];
  layout?: 'compact' | 'full';
}

export type TableBuilder = (result: any) => TableSpec[];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDecimal(value: any): string {
  if (typeof value !== 'number' || isNaN(value)) return value ?? '';

  const abs = Math.abs(value);
  if (abs === 0) return '0';

  // Too small or too big numbers -> scientific
  if (abs < 1e-4 || abs >= 1_000_000) {
    return value.toExponential(3);
  }

  const decimals = abs < 1 ? 4 : 3;
  let formatted = value.toFixed(decimals);

  formatted = formatted
    .replace(/(\.\d*?[1-9])0+$/u, '$1')
    .replace(/\.0+$/u, '');

  if (formatted === '-0') formatted = '0';

  return formatted;
}

function formatTTestKey(key: string): string {
  const map: Record<string, string> = {
    mean_diff: 'Mean Difference',
    se_diff: 'Std. Error of Difference',
    se_difference: 'Std. Error of Difference',
    std_err_diff: 'Std. Error of Difference',
    ci_upper: '95% CI Upper',
    ci_lower: '95% CI Lower',
    t_stat: 'T-statistic',
    p: 'p-value',
    p_value: 'p-value',
    df: 'Degrees of Freedom',
    dof: 'Degrees of Freedom',
    cohens_d: "Cohen's d",
    cohen_d: "Cohen's d",
  };
  if (map[key]) return map[key];

  // Fallback for unknown keys
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildTTestRows(result: Record<string, any>): any[][] {
  const ignoredKeys = new Set([
    'title',
    'labelMap',
    'enumMaps',
    'yVar',
    'xVar',
    '__labelMap__',
    '__enumMaps__',
    '__yVar__',
    '__xVar__',
  ]);

  return Object.entries(result)
    .filter(([key, value]) => {
      if (ignoredKeys.has(key) || key.startsWith('__')) return false;
      if (Array.isArray(value)) return false;
      if (value !== null && typeof value === 'object') return false;
      return true;
    })
    .map(([k, v]) => [formatTTestKey(k), v]);
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
    if (!result) return [];

    const coefTable = result?.coefficients;
    const infoTable = result?.model_info;

    // (A) Object-style coefficients + model_info
    if (coefTable && infoTable && typeof coefTable === 'object' && !Array.isArray(coefTable)) {
      const coefRows = Object.entries(coefTable).map(([variable, stats]: [string, any]) => [
        variable,
        formatDecimal(stats?.coefficient),
        formatDecimal(stats?.std_err),
        formatDecimal(stats?.z_score),
        formatDecimal(stats?.p_value),
        formatDecimal(stats?.ci_lower),
        formatDecimal(stats?.ci_upper),
      ]);

      const infoRows = Object.entries(infoTable).map(([key, value]) => [key, formatDecimal(value)]);

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
    }

    // (B) Array-style coefficients (backend format)
    const indepVars: any[] = Array.isArray(result?.indep_vars) ? result.indep_vars : [];
    const coefficients: any[] = Array.isArray(result?.coefficients) ? result.coefficients : [];
    const stdErr: any[] = Array.isArray(result?.std_err) ? result.std_err : [];
    const tStats: any[] = Array.isArray(result?.t_stats) ? result.t_stats : [];
    const pValues: any[] = Array.isArray(result?.pvalues) ? result.pvalues : [];
    const lowerCi: any[] = Array.isArray(result?.lower_ci) ? result.lower_ci : [];
    const upperCi: any[] = Array.isArray(result?.upper_ci) ? result.upper_ci : [];

    if (indepVars.length && coefficients.length) {
      const coefRows = indepVars.map((variable, idx) => [
        variable,
        formatDecimal(coefficients[idx]),
        formatDecimal(stdErr[idx]),
        formatDecimal(tStats[idx]),
        formatDecimal(pValues[idx]),
        formatDecimal(lowerCi[idx]),
        formatDecimal(upperCi[idx]),
      ]);

      const infoKeys: Array<[string, string]> = [
        ['dependent_var', 'Dependent variable'],
        ['n_obs', 'Observations'],
        ['df_model', 'Degrees of Freedom (Model)'],
        ['df_resid', 'Degrees of Freedom (Residual)'],
        ['r_squared', 'R² Score'],
        ['r_squared_adjusted', 'Adjusted R²'],
        ['f_stat', 'F-statistic'],
        ['f_pvalue', 'p-value (F-stat)'],
        ['rse', 'Residual Std. Error'],
        ['ll', 'Log-likelihood'],
        ['aic', 'AIC'],
        ['bic', 'BIC'],
      ];

      const infoRows = infoKeys
        .filter(([key]) => result?.[key] !== undefined)
        .map(([key, label]) => [label, formatDecimal(result[key])]);

      return [
        {
          title: 'Coefficients',
          columns: ['Independent variables', 'Coefficients', 'Std.Err.', 't-stats', 'P(>|t|)', 'Lower 95% c.i.', 'Upper 95% c.i.'],
          rows: coefRows,
        },
        {
          title: 'Model Summary',
          columns: ['Name', 'Value'],
          rows: infoRows,
          layout: 'full',
        },
      ];
    }

    return [];
  },

  linear_regression_cv: (result) => {
    if (!result) return [];

    // 1) Training set sample sizes
    const nObs = result?.n_obs;
    const sampleSizeRows = Array.isArray(nObs)
      ? nObs.map((val: number, i: number) => [`Fold ${i + 1}`, val])
      : [];

    const getMetric = (field: any): [number | null, number | null] => {
      if (!field) return [null, null];

      if (Array.isArray(field)) {
        return [
          typeof field[0] === 'number' ? field[0] : null,
          typeof field[1] === 'number' ? field[1] : null,
        ];
      }

      if (typeof field === 'object') {
        const avg = typeof field.avg === 'number'
          ? field.avg
          : typeof field.mean === 'number'
            ? field.mean
            : null;
        const std = typeof field.std === 'number' ? field.std : null;
        return [avg, std];
      }

      // fallback
      return [typeof field === 'number' ? field : null, null];
    };

    const [rmseMean, rmseStd] = getMetric(result?.mean_sq_error);
    const [r2Mean, r2Std] = getMetric(result?.r_squared);
    const [maeMean, maeStd] = getMetric(result?.mean_abs_error);
    const [fstatMean, fstatStd] = getMetric(result?.f_stat);

    const summaryRows = [
      ['Root mean squared error', rmseMean, rmseStd],
      ['R-squared', r2Mean, r2Std],
      ['Mean absolute error', maeMean, maeStd],
      ['F-statistic', fstatMean, fstatStd],
    ].filter(([, mean, std]) => mean !== null || std !== null);

    const tables: TableSpec[] = [];
    tables.push({
        title: 'Training set sample sizes',
        columns: ['Fold', 'Training Set Sample Sizes'],
        rows: sampleSizeRows,
    });

    tables.push({
        title: 'Error metrics',
        columns: ['Metric', 'Mean', 'Standard Deviation'],
        rows: summaryRows,
    });

    return tables;
  },



  naive_bayes_gaussian: (result) => {
    if (!result) return [];
    const tables: TableSpec[] = [];

    const lm: Record<string, string> = result?.__labelMap__ ?? {};
    const em: Record<string, Record<string, string>> = result?.__enumMaps__ ?? {};
    const yVar: string = result?.__yVar__;

    const resolveLabel = (code: string, isClass = false) => {
      // If it's a class, try resolving from y-variable enumerations first
      if (isClass && yVar && em[yVar] && em[yVar][code]) {
        return em[yVar][code];
      }
      // Otherwise try the general label map (for variable names)
      return lm[code] || code;
    };

    const classes: string[] = result?.classes ?? [];
    const featureNames: string[] = result?.feature_names ?? [];

    // Class summary table: class name, count, prior
    const classCount: number[] = result?.class_count ?? [];
    const classPrior: number[] = result?.class_prior ?? [];
    if (classes.length > 0) {
      tables.push({
        title: 'Class Summary',
        columns: ['Class', 'Count', 'Prior'],
        rows: classes.map((cls: string, i: number) => [
          resolveLabel(String(cls), true),
          formatDecimal(classCount[i]),
          formatDecimal(classPrior[i]),
        ]),
        layout: 'full',
      });
    }

    // Theta table: means per class × feature
    const theta = result?.theta;
    if (Array.isArray(theta) && theta.length > 0) {
      const columns = ['Class', ...featureNames.map(f => resolveLabel(f))];
      const rows = theta.map((row: number[], i: number) => [
        resolveLabel(String(classes[i] ?? `Class ${i}`), true),
        ...row.map((v: number) => formatDecimal(v)),
      ]);
      tables.push({ title: 'Feature Means per Class (θ)', columns, rows, layout: 'full' });
    }

    // Variance table: variances per class × feature
    const variance = result?.var;
    if (Array.isArray(variance) && variance.length > 0) {
      const columns = ['Class', ...featureNames.map(f => resolveLabel(f))];
      const rows = variance.map((row: number[], i: number) => [
        resolveLabel(String(classes[i] ?? `Class ${i}`), true),
        ...row.map((v: number) => formatDecimal(v)),
      ]);
      tables.push({ title: 'Feature Variances per Class (σ²)', columns, rows, layout: 'full' });
    }

    return tables;
  },

  naive_bayes_gaussian_cv: (result) => {
    const summary = result?.classification_summary;
    if (!summary) return [];

    const metrics = ['accuracy', 'precision', 'recall', 'fscore'];
    // Ensure we have data for the first metric to detect classes
    if (!summary.accuracy) return [];

    const classes = Object.keys(summary.accuracy); // e.g. F, M
    if (!classes.length) return [];

    const folds = Object.keys(summary.accuracy[classes[0]]).filter(k => k !== 'average' && k !== 'stdev');

    const rows = [...folds, 'average', 'stdev'].map(fold => {
      const row: any[] = [fold];
      for (const metric of metrics) {
        // Guard against missing metrics
        if (!summary[metric]) {
          for (const cls of classes) row.push('');
          continue;
        }
        for (const cls of classes) {
          row.push(formatDecimal(summary[metric][cls]?.[fold]));
        }
      }
      // n_obs is usually adjacent to accuracy/precision objects, check both locations
      const nObsVal = summary.n_obs?.[fold] ?? summary[classes[0]]?.n_obs?.[fold];
      row.push(formatDecimal(nObsVal));
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
        layout: 'full'
      },
    ];
  },

  logistic_regression: (result) => {
    if (!result) return [];

    const dep = result?.dependent_var ?? '';
    const indep: string[] = Array.isArray(result?.indep_vars) ? result.indep_vars : [];

    const s = result?.summary ?? {};
    const coef: number[] = Array.isArray(s?.coefficients) ? s.coefficients : [];
    const se: number[] = Array.isArray(s?.std_err)
      ? s.std_err
      : Array.isArray(s?.stderr)
        ? s.stderr
        : [];
    const z: number[] = Array.isArray(s?.z_scores) ? s.z_scores : [];
    const p: number[] = Array.isArray(s?.pvalues) ? s.pvalues : [];
    const lo: number[] = Array.isArray(s?.lower_ci) ? s.lower_ci : [];
    const hi: number[] = Array.isArray(s?.upper_ci) ? s.upper_ci : [];

    // needs at least coefficients + indep vars
    if (!indep.length || !coef.length) return [];

    const n = Math.min(indep.length, coef.length, se.length || indep.length);

    const coefRows: any[][] = [];
    for (let i = 0; i < n; i++) {
      coefRows.push([
        indep[i] ?? `var_${i + 1}`,
        formatDecimal(coef[i]),
        formatDecimal(se[i]),
        formatDecimal(z[i]),
        formatDecimal(p[i]),
        formatDecimal(lo[i]),
        formatDecimal(hi[i]),
      ]);
    }

    // Model info rows, if not arrays
    const modelInfoKeys = Object.keys(s).filter((k) => !Array.isArray((s as any)[k]));
    const modelInfoRows: any[][] = [
      ...(dep ? [['Dependent variable', dep]] : []),
      ...modelInfoKeys.map((k) => [capitalize(k.replace(/_/g, ' ')), formatDecimal((s as any)[k])]),
    ];

    return [
      {
        title: 'Logistic Regression Coefficients',
        columns: ['Variable', 'Coefficient', 'Std.Err.', 'z', 'P(>|z|)', 'Lower 95% CI', 'Upper 95% CI'],
        rows: coefRows,
      },
      {
        title: 'Model Summary',
        columns: ['Metric', 'Value'],
        rows: modelInfoRows,
        layout: 'full',
      },
    ];
  },

  // Legacy alias retained for backwards compatibility with historical payloads.
  logistic_regression_cv_fedaverage: (result: any, title = 'Logistic Regression Cross-Validation'): TableSpec[] => {
    if (!result) return [];

    // (A) Preferred: summary tabular shape
    // summary: { row_names: string[], n_obs: number[], accuracy: number[], ... }

    const s = result?.summary;
    const rowNames: any[] = Array.isArray(s?.row_names) ? s.row_names : (Array.isArray(s?.fold_names) ? s.fold_names : []);

    const nObsArr: any[] = Array.isArray(s?.n_obs) ? s.n_obs : [];
    const accArr: any[] = Array.isArray(s?.accuracy) ? s.accuracy : [];
    const recArr: any[] = Array.isArray(s?.recall) ? s.recall : [];
    const precArr: any[] = Array.isArray(s?.precision) ? s.precision : [];
    const fArr: any[] = Array.isArray(s?.fscore) ? s.fscore : (Array.isArray(s?.f1) ? s.f1 : []);

    const hasSummary =
      rowNames.length > 0 &&
      (accArr.length === rowNames.length || recArr.length === rowNames.length || precArr.length === rowNames.length || fArr.length === rowNames.length);

    if (hasSummary) {
      const n = rowNames.length;

      const rows: any[][] = [];
      for (let i = 0; i < n; i++) {
        rows.push([
          rowNames[i] ?? `fold_${i + 1}`,
          nObsArr[i] == null ? '' : formatDecimal(nObsArr[i]),
          formatDecimal(accArr[i]),
          formatDecimal(recArr[i]),
          formatDecimal(precArr[i]),
          formatDecimal(fArr[i]),
        ]);
      }

      return [
        {
        title,
        columns: ['Fold', 'Number of observations', 'Accuracy', 'Recall', 'Precision', 'F-score'],
        rows,
        }
      ];
    }

    // (B) Alternative: metrics array shape
    // metrics: Array<{ fold, n_obs, accuracy, recall, precision, fscore }>

    const metrics = Array.isArray(result?.metrics) ? result.metrics : null;
    if (metrics?.length) {
      const getFoldLabel = (m: any) => m.fold ?? m.fold_id ?? m.name ?? m.id ?? '';
      const getVal = (m: any, keys: string[]) => {
        for (const k of keys) if (m?.[k] !== undefined) return m[k];
        return null;
      };

      const rows = metrics.map((m: any) => [
        getFoldLabel(m),
        (() => {
          const v = getVal(m, ['n_obs', 'n', 'num_observations', 'observations']);
          return v == null ? '' : formatDecimal(v);
        })(),
        formatDecimal(getVal(m, ['accuracy', 'acc'])),
        formatDecimal(getVal(m, ['recall', 'tpr'])),
        formatDecimal(getVal(m, ['precision', 'ppv'])),
        formatDecimal(getVal(m, ['fscore', 'f_score', 'f1', 'f1_score'])),
      ]);

      return [
        {
        title,
        columns: ['Fold', 'Number of observations', 'Accuracy', 'Recall', 'Precision', 'F-score'],
        rows,
        }
      ];
    }

    return [];
  },

  logistic_regression_cv: (result: any, title = 'Logistic Regression Cross-Validation'): TableSpec[] => {
    if (!result) return [];

    // (A) Preferred: summary tabular shape
    // summary: { row_names: string[], n_obs: number[], accuracy: number[], ... }

    const s = result?.summary;
    const rowNames: any[] = Array.isArray(s?.row_names) ? s.row_names : (Array.isArray(s?.fold_names) ? s.fold_names : []);

    const nObsArr: any[] = Array.isArray(s?.n_obs) ? s.n_obs : [];
    const accArr: any[] = Array.isArray(s?.accuracy) ? s.accuracy : [];
    const recArr: any[] = Array.isArray(s?.recall) ? s.recall : [];
    const precArr: any[] = Array.isArray(s?.precision) ? s.precision : [];
    const fArr: any[] = Array.isArray(s?.fscore) ? s.fscore : (Array.isArray(s?.f1) ? s.f1 : []);

    const hasSummary =
      rowNames.length > 0 &&
      (accArr.length === rowNames.length || recArr.length === rowNames.length || precArr.length === rowNames.length || fArr.length === rowNames.length);

    if (hasSummary) {
      const n = rowNames.length;

      const rows: any[][] = [];
      for (let i = 0; i < n; i++) {
        rows.push([
          rowNames[i] ?? `fold_${i + 1}`,
          nObsArr[i] == null ? '' : formatDecimal(nObsArr[i]),
          formatDecimal(accArr[i]),
          formatDecimal(recArr[i]),
          formatDecimal(precArr[i]),
          formatDecimal(fArr[i]),
        ]);
      }

      return [
        {
        title,
        columns: ['Fold', 'Number of observations', 'Accuracy', 'Recall', 'Precision', 'F-score'],
        rows,
        }
      ];
    }

    // (B) Alternative: metrics array shape
    // metrics: Array<{ fold, n_obs, accuracy, recall, precision, fscore }>

    const metrics = Array.isArray(result?.metrics) ? result.metrics : null;
    if (metrics?.length) {
      const getFoldLabel = (m: any) => m.fold ?? m.fold_id ?? m.name ?? m.id ?? '';
      const getVal = (m: any, keys: string[]) => {
        for (const k of keys) if (m?.[k] !== undefined) return m[k];
        return null;
      };

      const rows = metrics.map((m: any) => [
        getFoldLabel(m),
        (() => {
          const v = getVal(m, ['n_obs', 'n', 'num_observations', 'observations']);
          return v == null ? '' : formatDecimal(v);
        })(),
        formatDecimal(getVal(m, ['accuracy', 'acc'])),
        formatDecimal(getVal(m, ['recall', 'tpr'])),
        formatDecimal(getVal(m, ['precision', 'ppv'])),
        formatDecimal(getVal(m, ['fscore', 'f_score', 'f1', 'f1_score'])),
      ]);

      return [
        {
        title,
        columns: ['Fold', 'Number of observations', 'Accuracy', 'Recall', 'Precision', 'F-score'],
        rows,
        }
      ];
    }

    return [];
  },

  naive_bayes_categorical: (result) => {
    if (!result) return [];
    const tables: TableSpec[] = [];

    const lm: Record<string, string> = result?.__labelMap__ ?? {};
    const em: Record<string, Record<string, string>> = result?.__enumMaps__ ?? {};
    const yVar: string = result?.__yVar__;

    const resolveLabel = (code: string, isClass = false) => {
      if (isClass && yVar && em[yVar] && em[yVar][code]) {
        return em[yVar][code];
      }
      return lm[code] || code;
    };

    const classes: string[] = result?.classes ?? [];
    const featureNames: string[] = result?.feature_names ?? [];

    // Class summary table
    const classCount: number[] = result?.class_count ?? [];
    const classLogPrior: number[] = result?.class_log_prior ?? [];
    if (classes.length > 0) {
      tables.push({
        title: 'Class Summary',
        columns: ['Class', 'Count', 'Log Prior'],
        rows: classes.map((cls: string, i: number) => [
          resolveLabel(String(cls), true),
          formatDecimal(classCount[i]),
          formatDecimal(classLogPrior[i]),
        ]),
        layout: 'full',
      });
    }

    // Category count tables — one per feature
    const categoryCount: Record<string, number[][]> = result?.category_count ?? {};
    const categoryLogProb: Record<string, number[][]> = result?.category_log_prob ?? {};
    const categories: Record<string, string[]> = result?.categories ?? {};

    for (const featureName of featureNames) {
      const counts = categoryCount[featureName];
      const catLabels = categories[featureName] ?? [];
      if (!Array.isArray(counts) || counts.length === 0) continue;

      // Resolve category labels using the feature's enum map if available
      const resolveCategory = (cat: string) => {
        if (em[featureName] && em[featureName][cat]) {
          return em[featureName][cat];
        }
        return cat;
      };

      // counts is [numClasses][numCategories]
      const numCategories = Array.isArray(counts[0]) ? counts[0].length : 0;
      const columns = ['Category', ...classes.map(cls => resolveLabel(String(cls), true))];
      const rows = Array.from({ length: numCategories }, (_, catIdx) => [
        resolveCategory(String(catLabels[catIdx] ?? `Cat ${catIdx}`)),
        ...counts.map((classCounts: number[]) => formatDecimal(classCounts[catIdx])),
      ]);
      tables.push({
        title: `Category Counts — ${resolveLabel(featureName)}`,
        columns,
        rows,
        layout: 'full',
      });

      const logProb = categoryLogProb[featureName];
      if (Array.isArray(logProb) && logProb.length > 0) {
        const logRows = Array.from({ length: numCategories }, (_, catIdx) => [
          resolveCategory(String(catLabels[catIdx] ?? `Cat ${catIdx}`)),
          ...logProb.map((classLogProb: number[]) => formatDecimal(classLogProb[catIdx])),
        ]);
        tables.push({
          title: `Category Log Probabilities — ${resolveLabel(featureName)}`,
          columns,
          rows: logRows,
          layout: 'full',
        });
      }
    }

    return tables;
  },

  pca: (result) => {
    if (!result || typeof result !== 'object') return [];

    const tables: TableSpec[] = [];
    const metadataRows: any[][] = [];
    if (result?.title) metadataRows.push(['Title', result.title]);
    if (result?.n_obs !== undefined) metadataRows.push(['Observations', formatDecimal(result.n_obs)]);

    if (metadataRows.length) {
      tables.push({
        title: 'PCA Summary',
        columns: ['Metric', 'Value'],
        rows: metadataRows,
      });
    }

    return tables;
  },

  pca_with_transformation: (result) => {
    return AlgorithmTableRegistry['pca'](result);
  },

  describe: (result) => {
    if (!result || typeof result !== 'object') return [];

    const tables: TableSpec[] = [];
    const buildDescribeTables = (entries: any[], prefix: string) => {
      if (!entries.length) return;

      const numericRows = entries
        .filter((entry) => entry?.data && typeof entry.data === 'object' && !('counts' in entry.data))
        .map((entry) => {
          const data = entry.data;
          return [
            entry.variable ?? '',
            entry.dataset ?? '',
            formatDecimal(data?.num_dtps),
            formatDecimal(data?.num_na),
            formatDecimal(data?.num_total),
            formatDecimal(data?.mean),
            formatDecimal(data?.std),
            formatDecimal(data?.min),
            formatDecimal(data?.q1),
            formatDecimal(data?.q2),
            formatDecimal(data?.q3),
            formatDecimal(data?.max),
          ];
        });

      if (numericRows.length) {
        tables.push({
          title: `${prefix} — Numeric`,
          columns: ['Variable', 'Dataset', 'Datapoints', 'Missing', 'Total', 'Mean', 'Std', 'Min', 'Q1', 'Median', 'Q3', 'Max'],
          rows: numericRows,
          layout: 'full',
        });
      }

      const nominalRows = entries
        .filter((entry) => entry?.data && typeof entry.data === 'object' && 'counts' in entry.data)
        .map((entry) => {
          const data = entry.data;
          const counts = data?.counts && typeof data.counts === 'object'
            ? Object.entries(data.counts).map(([k, v]) => `${k}: ${v}`).join('; ')
            : '';
          return [
            entry.variable ?? '',
            entry.dataset ?? '',
            formatDecimal(data?.num_dtps),
            formatDecimal(data?.num_na),
            formatDecimal(data?.num_total),
            counts,
          ];
        });

      if (nominalRows.length) {
        tables.push({
          title: `${prefix} — Nominal`,
          columns: ['Variable', 'Dataset', 'Datapoints', 'Missing', 'Total', 'Counts'],
          rows: nominalRows,
          layout: 'full',
        });
      }
    };

    const variableBased = Array.isArray(result?.variable_based) ? result.variable_based : [];
    const modelBased = Array.isArray(result?.model_based) ? result.model_based : [];

    buildDescribeTables(variableBased, 'Variable-based Summary');
    buildDescribeTables(modelBased, 'Model-based Summary');

    return tables;
  },

  naive_bayes_categorical_cv: (result) => {
    // Reuse the logic from Gaussian if the structure is the same (classification_summary)
    const summary = result?.classification_summary;

    // Fallback: old 'metrics' array support
    if (!summary) {
      const metrics = result?.metrics;
      if (!Array.isArray(metrics)) return [];
      const columns = Object.keys(metrics[0]);
      const rows = metrics.map((m: any) => columns.map(col => m[col]));
      return [{ title: 'Categorical Naive Bayes CV Metrics', columns, rows, layout: 'full' }];
    }

    const metrics = ['accuracy', 'precision', 'recall', 'fscore'];
    // Ensure we have data for the first metric to detect classes
    if (!summary.accuracy) return [];

    const classes = Object.keys(summary.accuracy); // e.g. F, M
    if (!classes.length) return [];

    const folds = Object.keys(summary.accuracy[classes[0]]).filter(k => k !== 'average' && k !== 'stdev');

    const rows = [...folds, 'average', 'stdev'].map(fold => {
      const row: any[] = [fold];
      for (const metric of metrics) {
        // Guard against missing metrics
        if (!summary[metric]) {
          for (const cls of classes) row.push('');
          continue;
        }
        for (const cls of classes) {
          row.push(formatDecimal(summary[metric][cls]?.[fold]));
        }
      }
      // n_obs is usually adjacent to accuracy/precision objects, check both locations
      const nObsVal = summary.n_obs?.[fold] ?? summary[classes[0]]?.n_obs?.[fold];
      row.push(formatDecimal(nObsVal));
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
        title: 'Categorical Naive Bayes CV Metrics',
        columns,
        rows,
        layout: 'full'
      },
    ];
  },

  pearson_correlation: (result) => {
    if (!result) return [];

    const tables: TableSpec[] = [];
    const lm = result?.__labelMap__ ?? {};
    const label = (code: string) => lm[code] || code;

    // Helper to extract matrix data
    const buildMatrixTable = (data: any, title: string) => {
      const vars = data?.variables;
      if (!Array.isArray(vars) || vars.length === 0) return;

      const columns = ['Variable', ...vars.map((v: string) => label(v))];
      const rows = vars.map((rowVar: string) => {
        const rowData = data[rowVar];
        if (!Array.isArray(rowData)) return [];
        return [
          label(rowVar),
          ...rowData.map((val: number) => formatDecimal(val))
        ];
      });

      tables.push({
        title,
        columns,
        rows,
        layout: 'full'
      });
    };

    // 1. P-Values and CI are now visualized as charts.

    // 2. Number of Observations

    // 3. Number of Observations
    // This might be a single number (if uniform) or a matrix (if pairwise/missing data)
    // The user input shows "n_obs=13310.0" as a scalar in the example description,
    // but typically Pearson might return a matrix if pairwise deletion is used.
    // Let's check if it's a matrix or scalar.
    if (result.n_obs) {
      if (typeof result.n_obs === 'object' && result.n_obs.variables) {
        // It's a matrix
        buildMatrixTable(result.n_obs, 'Number of Observations (N)');
      } else if (typeof result.n_obs === 'number') {
        // It's a scalar global N
        tables.push({
          title: 'Number of Observations',
          columns: ['Metric', 'Value'],
          rows: [['N', formatDecimal(result.n_obs)]],
          layout: 'compact'
        });
      }
    }

    return tables;
  },

  anova_oneway: (result) => {
    const table = result?.anova_table;
    const comparisons = result?.tuckey_test;
    const minMax = result?.min_max_per_group;
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
        p: table.p_value,
      },
      {
        label: 'Residual',
        df: table.df_residual,
        ss: table.ss_residual,
        ms: table.ms_residual,
        f: table.f_residual,
        p: table.p_residual,
      },
    ];

    const summaryCols = ['Source', 'DF', 'Sum of Squares', 'Mean Square', 'F ratio', 'P value'];
    const summaryRows = summaryData.map((row) => [
      row.label,
      formatDecimal(row.df),
      formatDecimal(row.ss),
      formatDecimal(row.ms),
      formatDecimal(row.f),
      formatP(row.p),
    ]);

    const compCols = Object.keys(comparisons[0]);
    const compRows = comparisons.map((r: any) =>
      compCols.map(c => formatDecimal(r[c]))
    );

    const tables: TableSpec[] = [
      {
        title: 'ANOVA Summary',
        columns: summaryCols,
        rows: summaryRows,
      },
      {
        title: 'Pairwise Comparisons',
        columns: compCols,
        rows: compRows,
      },
    ];

    const categories = Array.isArray(minMax?.categories) ? minMax.categories : [];
    const mins = Array.isArray(minMax?.min) ? minMax.min : [];
    const maxs = Array.isArray(minMax?.max) ? minMax.max : [];
    if (categories.length && categories.length === mins.length && categories.length === maxs.length) {
      tables.push({
        title: 'Group Min/Max',
        columns: ['Group', 'Min', 'Max'],
        rows: categories.map((category: any, idx: number) => [
          category,
          formatDecimal(mins[idx]),
          formatDecimal(maxs[idx]),
        ]),
      });
    }

    return tables;
  },

  anova_twoway: (result) => {
    if (!result) return [];

    // future proof, supports if backend returns table[]
    if (Array.isArray((result as any).table) && (result as any).table.length > 0) {
      const rows = (result as any).table;
      const columns = Object.keys(rows[0]);

      return [
        {
          title: 'Two-Way ANOVA Results',
          columns,
          rows: rows.map((r: any) => columns.map(c => formatDecimal(r[c]))),
        },
      ];
    }

    // Current layout: df[], sum_sq[], f_stat[] / f_value[], p_value[], terms[]
    const terms = Array.isArray(result.terms) ? result.terms : [];
    const df = Array.isArray(result.df) ? result.df : [];
    const ss = Array.isArray(result.sum_sq) ? result.sum_sq : [];
    const fArray =
      Array.isArray(result.f_stat)
        ? result.f_stat
        : Array.isArray(result.f_value)
          ? result.f_value
          : [];

    const p =
      Array.isArray(result.p_value)
        ? result.p_value
        : Array.isArray(result.pvalue)
          ? result.pvalue
          : Array.isArray(result.f_pvalue)
            ? result.f_pvalue
            : [];

    // Object-map layout: sum_sq/df/etc as { term: value }
    if (!terms.length && result.sum_sq && typeof result.sum_sq === 'object' && !Array.isArray(result.sum_sq)) {
      const keySet = new Set<string>([
        ...Object.keys(result.sum_sq || {}),
        ...Object.keys(result.df || {}),
        ...Object.keys(result.f_stat || {}),
        ...Object.keys(result.f_value || {}),
        ...Object.keys(result.p_value || {}),
        ...Object.keys(result.pvalue || {}),
        ...Object.keys(result.f_pvalue || {}),
      ]);
      const objTerms = Array.from(keySet);
      const rows: any[][] = objTerms.map((label) => [
        label,
        formatDecimal((result.df || {})[label]),
        formatDecimal((result.sum_sq || {})[label]),
        formatDecimal((result.ms || {})[label]),
        formatDecimal((result.f_stat || result.f_value || {})[label]),
        formatDecimal((result.p_value || result.pvalue || result.f_pvalue || {})[label]),
      ]);

      return [
        {
          title: 'Two-Way ANOVA Results',
          columns: ['Source', 'DF', 'Sum of Squares', 'Mean Square', 'F', 'P value'],
          rows,
        },
      ];
    }

    if (!terms.length) return [];

    const n = terms.length;
    const rows: any[][] = [];

    for (let i = 0; i < n; i++) {
      const label = terms[i];
      const dfVal = df[i];
      const ssVal = ss[i];
      const msVal =
        typeof dfVal === 'number' && dfVal !== 0 && typeof ssVal === 'number'
          ? ssVal / dfVal
          : null;
      const fVal = fArray[i];
      const pVal = p[i];

      rows.push([
        label,
        formatDecimal(dfVal),
        formatDecimal(ssVal),
        formatDecimal(msVal),
        formatDecimal(fVal),
        formatDecimal(pVal),
      ]);
    }

    const columns = ['Source', 'DF', 'Sum of Squares', 'Mean Square', 'F', 'P value'];

    return [
      {
        title: 'Two-Way ANOVA Results',
        columns,
        rows,
      },
    ];
  },

  // Legacy alias retained for backwards compatibility with historical payloads.
  anova: (result) => {
    return AlgorithmTableRegistry['anova_twoway'](result);
  },

  ttest_onesample: (result) => {
    if (!result || typeof result !== 'object') return [];
    const rows = buildTTestRows(result);
    return [
      {
        title: 'One-Sample T-Test',
        columns: ['Metric', 'Value'],
        rows,
      }
    ];
  },

  ttest_independent: (result) => {
    if (!result || typeof result !== 'object') return [];
    const rows = buildTTestRows(result);
    return [
      {
        title: 'Independent T-Test',
        columns: ['Metric', 'Value'],
        rows,
      }
    ];
  },

  ttest_paired: (result) => {
    if (!result || typeof result !== 'object') return [];
    const rows = buildTTestRows(result);
    return [
      {
        title: 'Paired T-Test',
        columns: ['Metric', 'Value'],
        rows,
      }
    ];
  },
  linear_svm: (result) => {
    return AlgorithmTableRegistry['svm_scikit'](result);
  },

  // Legacy alias retained for backwards compatibility.
  svm_scikit: (result) => {
    if (!result) return [];

    const nObs = result?.n_obs ?? null;
    const intercept = typeof result?.intercept === 'number' ? result.intercept : null;
    const coeff = Array.isArray(result?.coeff)
      ? result.coeff
      : Array.isArray(result?.weights)
        ? result.weights
        : [];
    const hasSupportVectors = Array.isArray(result?.support_vectors);
    const supportVectors = hasSupportVectors
      ? result.support_vectors.slice(0, 10)
      : Array.isArray(result?.weights)
        ? result.weights.slice(0, 10)
        : [];

    const tables: TableSpec[] = [];

    if (nObs !== null || intercept !== null) {
      const summaryRows = [];
      if (nObs !== null) summaryRows.push(['Observations', nObs]);
      if (intercept !== null) summaryRows.push(['Intercept', intercept.toFixed(4)]);
      tables.push({
        title: 'Model Summary',
        columns: ['Metric', 'Value'],
        rows: summaryRows,
        layout: 'full',
      });
    }

    if (coeff.length) {
      tables.push({
        title: 'Coefficients',
        columns: ['Coefficient'],
        rows: coeff.map((c: number) => [c.toFixed(4)]),
        layout: 'full',
      });
    }

    if (supportVectors.length) {
      tables.push({
        title: `${hasSupportVectors ? 'Support Vectors' : 'Weights'} (sample of ${supportVectors.length})`,
        columns: ['Value'],
        rows: supportVectors.map((v: number) => [v.toFixed(4)]),
        layout: 'full',
      });
    }

    return tables;
  },
  default: () => [],
};
