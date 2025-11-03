import { RawAlgorithmDefinition, RawParameter } from '../models/backend-algorithms.model';
import { AlgorithmConfig } from '../services/experiment-studio.service';

// Lookup για κατηγορίες
const CATEGORY_MAPPING: Record<string, string> = {
  "kmeans": "Machine Learning",
  "svm_scikit": "Machine Learning",
  "linear_regression": "Machine Learning",
  "linear_regression_cv": "Cross-validation",
  "logistic_regression": "Machine Learning",
  "logistic_regression_cv": "Cross-validation",
  "logistic_regression_cv_fedaverage": "Cross-validation",
  "naive_bayes_gaussian_cv": "Cross-validation",
  "naive_bayes_categorical_cv": "Cross-validation",
  "pearson_correlation": "Statistical Methods",
  "pca": "Statistical Methods",
  // "pca_with_transformation": "Statistical Methods",
  "ttest_onesample": "Statistical Methods",
  "ttest_independent": "Statistical Methods",
  "ttest_paired": "Statistical Methods",
  "anova_oneway": "Statistical Methods",
  "anova": "Statistical Methods",
  // "multiple_histograms": "Statistical Methods",
  // "descriptive_stats": "Statistical Methods",
};

function guessVariableType(ioField?: { types?: string[] }): string {
  if (!ioField) return "None";
  if (ioField?.types?.includes('int')) return "Numerical";
  if (ioField?.types?.includes('real')) return "Numerical";
  if (ioField?.types?.includes('text')) return "Nominal";
  return "Any";
}

// function buildConfigSchema(parameters: Record<string, RawParameter>): Array<any> {
//   const schema = [];

//   for (const [key, param] of Object.entries(parameters)) {
//     if (param.enums) {
//       schema.push({
//         key,
//         type: 'select',
//         label: param.label,
//         options: Array.isArray(param.enums.source) ? param.enums.source : [],
//       });
//     } else if (param.types.includes('int') || param.types.includes('real')) {
//       schema.push({
//         key,
//         type: 'number',
//         label: param.label,
//         ...(param.min !== undefined ? { min: +param.min } : {}),
//         ...(param.max !== undefined ? { max: +param.max } : {}),
//         ...(param.default !== undefined ? { default: +param.default } : {}),
//       });
//     } else if (param.types.includes('text')) {
//       schema.push({
//         key,
//         type: 'text',
//         label: param.label,
//       });
//     }
//   }
//   return schema;
// }

// export function mapRawAlgorithmToAlgorithmConfig(raw: RawAlgorithmDefinition): AlgorithmConfig {
//   return {
//     name: raw.name,
//     label: raw.label,
//     description: raw.desc,
//     inputdata: raw.inputdata ?? {},
//     requiredVariable: raw.inputdata?.y?.types || [],
//     covariate: raw.inputdata?.x?.types || [],
//     category: CATEGORY_MAPPING[raw.name],
//     configSchema: buildConfigSchema(raw.parameters),
//     type: raw.type || "exareme2",
//     isDisabled: false,
//     ...(getOutputSchema(raw.name) ? { outputSchema: getOutputSchema(raw.name) } : {})
//   };
// }

function buildConfigSchema(parameters: Record<string, RawParameter>): Array<any> {
  const schema = [];

  for (const [key, param] of Object.entries(parameters)) {
    const baseField: any = {
      key,
      label: param.label ?? key,
      desc: param.desc ?? '',
      notblank: param.notblank ?? false,
      multiple: param.multiple ?? false,
      types: param.types ?? [],
      stattypes: param.stattypes ?? [],
      ...(param.min !== undefined ? { min: +param.min } : {}),
      ...(param.max !== undefined ? { max: +param.max } : {}),
      ...(param.default !== undefined ? { default: param.default } : {}),
    };

    // --- Select fields ---
    if (param.enums) {
      schema.push({
        ...baseField,
        type: 'select',
        options: Array.isArray(param.enums?.source)
          ? param.enums.source
          : Array.isArray(param.enums)
          ? param.enums
          : [],
      });
      continue;
    }

    // --- Numeric fields ---
    if (param.types?.includes('int') || param.types?.includes('real')) {
      schema.push({
        ...baseField,
        type: 'number',
      });
      continue;
    }

    // --- Text fields ---
    if (param.types?.includes('text')) {
      schema.push({
        ...baseField,
        type: 'text',
      });
      continue;
    }

    // --- Fallback: keep unknown types as text ---
    schema.push({
      ...baseField,
      type: 'text',
    });
  }

  return schema;
}

export function mapRawAlgorithmToAlgorithmConfig(raw: RawAlgorithmDefinition): AlgorithmConfig {
  return {
    name: raw.name,
    label: raw.label,
    description: raw.desc ??  '',
    inputdata: raw.inputdata ?? {},
    requiredVariable: raw.inputdata?.y?.types || [],
    covariate: raw.inputdata?.x?.types || [],
    category: CATEGORY_MAPPING[raw.name] ?? 'Uncategorized',
    configSchema: buildConfigSchema(raw.parameters ?? {}),
    type: raw.type || 'exareme2',
    isDisabled: false,
    ...(getOutputSchema(raw.name) ? { outputSchema: getOutputSchema(raw.name) } : {}),
  };
}


export function getOutputSchema(algorithmName: string): any[] | undefined {
  // console.log("algorithm name in mappers: ", algorithmName);
  switch (algorithmName) {
    case 'anova':
      return [
        {
          key: 'sum_sq',
          label: 'Sum of Squares',
          type: 'table',
          columns: [
            { key: 'term', label: 'Term' },
            { key: 'value', label: 'Sum of Squares', format: 'float' }
          ]
        },
        {
          key: 'df',
          label: 'Degrees of Freedom',
          type: 'table',
          columns: [
            { key: 'term', label: 'Term' },
            { key: 'value', label: 'DF' }
          ]
        },
        {
          key: 'f_stat',
          label: 'F-statistic',
          type: 'table',
          columns: [
            { key: 'term', label: 'Term' },
            { key: 'value', label: 'F-statistic', format: 'float' }
          ]
        },
        {
          key: 'f_pvalue',
          label: 'p-value',
          type: 'table',
          columns: [
            { key: 'term', label: 'Term' },
            { key: 'value', label: 'p-value', format: 'pval' }
          ]
        }
      ];
    case 'anova_oneway':
      return [
        { key: 'n_obs', label: 'Observations', type: 'number' },
        { key: 'df_residual', label: 'Degrees of Freedom (Residual)', type: 'number' },
        { key: 'df_explained', label: 'Degrees of Freedom (Explained)', type: 'number' },
        { key: 'ss_residual', label: 'Sum of Squares (Residual)', type: 'number' },
        { key: 'ss_explained', label: 'Sum of Squares (Explained)', type: 'number' },
        { key: 'ms_residual', label: 'Mean Squares (Residual)', type: 'number' },
        { key: 'ms_explained', label: 'Mean Squares (Explained)', type: 'number' },
        { key: 'p_value', label: 'p-Value', type: 'number' },
        { key: 'f_stat', label: 'F-statistic', type: 'number' },
        {
          key: 'tuckey_test',
          label: 'Tukey Post-Hoc Test',
          type: 'table',
          columns: [
            { key: 'groupA', label: 'Group A' },
            { key: 'groupB', label: 'Group B' },
            { key: 'meanA', label: 'Mean A' },
            { key: 'meanB', label: 'Mean B' },
            { key: 'diff', label: 'Difference' },
            { key: 'se', label: 'Standard Error' },
            { key: 't_stat', label: 't-stat' },
            { key: 'p_tuckey', label: 'p (Tukey)' }
          ]
        }
      ];
    case 'kmeans':
      return [
        {
          key: 'centers',
          label: 'Cluster Centers',
          type: 'dynamic-table',
          getColumnsFrom: 'y',
          rowLabelPrefix: 'Cluster'
        }
      ];
    case 'linear_regression_cv':
      return [
        {
          type: 'table',
          label: 'Cross-Validation Metrics',
          key: 'cv_metrics',
          constructFrom: ['mean_sq_error', 'r_squared', 'mean_abs_error'],
          columns: [
            { key: 'fold', label: 'Fold' },
            { key: 'mean_sq_error', label: 'MSE' },
            { key: 'r_squared', label: 'R²' },
            { key: 'mean_abs_error', label: 'MAE' }
          ]
        }
      ];
    case 'linear_regression':
      return [
        {
          type: 'section',
          label: 'Model Summary',
          fields: [
            { key: 'n_obs', label: 'Observations', type: 'number' },
            { key: 'df_model', label: 'Degrees of Freedom (Model)', type: 'number' },
            { key: 'df_resid', label: 'Degrees of Freedom (Residual)', type: 'number' },
            { key: 'r_squared', label: 'R² Score', type: 'number' },
            { key: 'r_squared_adjusted', label: 'Adjusted R²', type: 'number' },
            { key: 'f_stat', label: 'F-statistic', type: 'number' },
            { key: 'f_pvalue', label: 'p-value (F-stat)', type: 'number' },
            { key: 'rse', label: 'Residual Std. Error', type: 'number' },
          ]
        },
        {
          type: 'table',
          key: 'coefficients_table',
          label: 'Coefficients',
          constructFrom: ['indep_vars', 'coefficients', 'std_err', 't_stats', 'pvalues', 'lower_ci', 'upper_ci'],
          columns: [
            { key: 'variable', label: 'Variable' },
            { key: 'coefficient', label: 'Coef.' },
            { key: 'std_err', label: 'Std. Error' },
            { key: 't_stat', label: 't-Stat' },
            { key: 'pvalue', label: 'p-value' },
            { key: 'ci', label: '95% CI' }
          ]
        }
      ];
    case 'logistic_regression_cv':
      return [
        {
          key: 'accuracy',
          label: 'Accuracy (per fold)',
          type: 'array',
        },
        {
          key: 'recall',
          label: 'Recall (per fold)',
          type: 'array',
        },
        {
          key: 'precision',
          label: 'Precision (per fold)',
          type: 'array',
        },
        {
          key: 'fscore',
          label: 'F1 Score (per fold)',
          type: 'array',
        },
        {
          key: 'auc',
          label: 'AUC (per fold)',
          type: 'array',
        }
      ];
    case 'logistic_regression':
      return [
        { key: 'n_obs', label: 'Observations', type: 'number' },
        { key: 'df_model', label: 'Degrees of Freedom (Model)', type: 'number' },
        { key: 'df_resid', label: 'Degrees of Freedom (Residual)', type: 'number' },
        { key: 'r_squared_cs', label: 'Cox-Snell R²', type: 'number' },
        { key: 'r_squared_mcf', label: 'McFadden R²', type: 'number' },
        { key: 'll0', label: 'Log-Likelihood (null model)', type: 'number' },
        { key: 'll', label: 'Log-Likelihood (fitted model)', type: 'number' },
        { key: 'aic', label: 'AIC', type: 'number' },
        { key: 'bic', label: 'BIC', type: 'number' },
        {
          key: 'coefficients',
          label: 'Coefficients',
          type: 'array'
        },
        {
          key: 'stderr',
          label: 'Standard Error',
          type: 'array'
        },
        {
          key: 'z_scores',
          label: 'Z-scores',
          type: 'array'
        },
        {
          key: 'pvalues',
          label: 'P-values',
          type: 'array'
        },
        {
          key: 'lower_ci',
          label: 'Lower CI',
          type: 'array'
        },
        {
          key: 'upper_ci',
          label: 'Upper CI',
          type: 'array'
        }
      ];
    case 'pca':
      return [
        { key: 'n_obs', label: 'Observations', type: 'number' },
        {
          key: 'eigenvalues',
          label: 'Eigenvalues',
          type: 'list',
          elementType: 'number'
        },
        {
          key: 'eigenvectors',
          label: 'Eigenvectors',
          type: 'matrix',
          elementType: 'number'
        }
      ];
    case 'pearson_correlation':
      return [
        { key: 'n_obs', label: 'Observations', type: 'number' },
        {
          key: 'correlations',
          label: 'Correlation Matrix',
          type: 'matrix',
          elementType: 'float',
          variablesKey: 'variables'
        },
        {
          key: 'p-values',
          label: 'p-values Matrix',
          type: 'matrix',
          elementType: 'pval',
          variablesKey: 'variables'
        },
        {
          key: 'low_confidence_intervals',
          label: 'Lower 95% CI',
          type: 'matrix',
          elementType: 'float',
          variablesKey: 'variables'
        },
        {
          key: 'high_confidence_intervals',
          label: 'Upper 95% CI',
          type: 'matrix',
          elementType: 'float',
          variablesKey: 'variables'
        }
      ];
    case 'svm_scikit':
      return [
        { key: 'n_obs', label: 'Observations', type: 'number' },
        {
          key: 'coeff',
          label: 'Coefficients',
          type: 'array',
          elementType: 'number'
        },
        {
          key: 'support_vectors',
          label: 'Support Vectors',
          type: 'array',
          elementType: 'number'
        }
      ];
    case 'ttest_independent':
      return [
        { key: 'statistic', label: 'Test Statistic (t)', type: 'number' },
        { key: 'p_value', label: 'p-value', type: 'number', format: 'pval' },
        { key: 'df', label: 'Degrees of Freedom', type: 'number' },
        { key: 'mean_diff', label: 'Mean Difference', type: 'number' },
        { key: 'se_difference', label: 'Std. Error of Difference', type: 'number' },
        { key: 'ci_lower', label: 'CI Lower', type: 'string' },  // ή 'number' αν το χειρίζεσαι αλλιώς
        { key: 'ci_upper', label: 'CI Upper', type: 'string' },
        { key: 'cohens_d', label: 'Cohen\'s d', type: 'number' }
      ];
    case 'ttest_onesample':
      return [
        { key: 'n_obs', label: 'Observations', type: 'number' },
        { key: 't_value', label: 'Test Statistic (t)', type: 'number' },
        { key: 'p_value', label: 'p-value', type: 'number', format: 'pval' },
        { key: 'df', label: 'Degrees of Freedom', type: 'number' },
        { key: 'mean_diff', label: 'Mean Difference', type: 'number' },
        { key: 'se_diff', label: 'Std. Error', type: 'array' }, // αν έχει πάντα ένα στοιχείο μπορούμε να το χειριστούμε
        { key: 'ci_lower', label: 'CI Lower', type: 'string' },
        { key: 'ci_upper', label: 'CI Upper', type: 'string' },
        { key: 'cohens_d', label: 'Cohen\'s d', type: 'number' }
      ];
    case 'naive_bayes_categorical_cv':
      return [
        {
          type: 'section',
          label: 'Model Info',
          fields: [
            { key: 'class_count', label: 'Class Counts', type: 'array', elementType: 'number' },
            {
              key: 'category_count',
              label: 'Category Counts',
              type: 'nested-table',
              description: 'Per-class counts per category',
              columns: [
                { key: 'categoryIndex', label: 'Category' },
                { key: 'value0', label: 'Count A' },
                { key: 'value1', label: 'Count B' }
              ]
            }
          ]
        },
        {
          key: 'predictions',
          label: 'Predictions',
          type: 'dictionary',
          description: 'Predicted class distribution'
        }
      ];
    case 'naive_bayes_gaussian_cv':
      return [
        {
          type: 'section',
          label: 'Model Parameters',
          fields: [
            {
              key: 'class_count',
              label: 'Class Counts',
              type: 'array',
              elementType: 'number'
            },
            {
              key: 'theta',
              label: 'Feature Means per Class',
              type: 'matrix',
              elementType: 'number'
            },
            {
              key: 'var',
              label: 'Feature Variances per Class',
              type: 'matrix',
              elementType: 'number'
            }
          ]
        },
        {
          key: 'predictions',
          label: 'Predictions',
          type: 'dictionary',
          description: 'Predicted class distribution'
        }
      ];

    default:
      return undefined;
  }
}
