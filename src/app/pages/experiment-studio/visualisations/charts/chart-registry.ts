import { EChartsOption } from 'echarts';
import { buildRocCurveChart } from './renderers/roc-curve-chart';
import { buildMatrixChart } from './renderers/matrix-chart';
import { buildBarChart } from './renderers/bar-chart';
import { buildPCAHeatmapChart } from './renderers/pca-heatmap-chart';
import { buildNaiveBayesConfusionChart } from './renderers/naive-bayes-confusion-matrix-chart';
import { buildLogRegConfusionChart } from './renderers/log-reg-confusion-matrix-chart';
import { buildKMeansChart } from './renderers/k-means-chart';
import { buildMeanPlotChart } from './renderers/mean-plot-chart';
import { buildBoxPlotChart } from './renderers/box-plot-chart';

export interface AlgorithmChartConfig {
  build: (input: any) => EChartsOption[];
  inputPath: string;
}

function composeCharts(...builders: ((result: any) => EChartsOption[])[]): (result: any) => EChartsOption[] {
  return (result: any) => builders.flatMap(fn => fn(result));
}

export const AlgorithmChartRegistry: Record<string, AlgorithmChartConfig> = {
  kmeans: {
    build: buildKMeansChart,
    inputPath: '',
  },
  logistic_regression_cv: {
    build: composeCharts(buildLogRegConfusionChart, buildRocCurveChart),
    inputPath: '',
  },
  naive_bayes_gaussian_cv: {
    build: buildNaiveBayesConfusionChart,
    inputPath: '',
  },
  naive_bayes_categorical_cv: {
    build: buildNaiveBayesConfusionChart,
    inputPath: '',
  },
  pearson_correlation: {
    build: buildMatrixChart,
    inputPath: '', // Top-level result
  },
  pca: {
    build: buildPCAHeatmapChart,
    inputPath: '',
  },
  anova_oneway: {
    build: composeCharts(buildBarChart, buildMeanPlotChart),
    inputPath: '',
  },
    descriptive_stats: {
    build: buildBoxPlotChart,
    inputPath: '',
  },
  default: {
    build: () => [],
    inputPath: '',
  },
};

