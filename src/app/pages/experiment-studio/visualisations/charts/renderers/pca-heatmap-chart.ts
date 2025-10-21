import { EChartsOption } from "echarts";

export function buildPCAHeatmapChart(result: any): EChartsOption[] {
  const matrix = result?.eigenvectors;

  console.log('[PCAHeatmap] result:', result);
  if (!matrix || !Array.isArray(matrix)) {
    console.warn('[PCAHeatmap] Eigenvectors missing or invalid');
    return [];
  }

  const nComponents = matrix.length;
  const nVariables = matrix[0]?.length ?? 0;

  if (!nComponents || !nVariables) {
    console.warn('[PCAHeatmap] Invalid shape');
    return [];
  }

  const variableNames = Array.from({ length: nVariables }, (_, i) => `Var${i + 1}`);
  const componentNames = Array.from({ length: nComponents }, (_, i) => `PC${i + 1}`);

  const heatmapData: [number, number, number][] = [];

  for (let i = 0; i < nComponents; i++) {
    for (let j = 0; j < nVariables; j++) {
      const value = matrix[i][j];
      heatmapData.push([j, i, value]);
    }
  }

  return [
    {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const [x, y, val] = params.value;
          return `PC: ${componentNames[y]}<br/>Var: ${variableNames[x]}<br/>Weight: ${val.toFixed(3)}`;
        },
      },
      grid: {
        height: '80%',
        top: '10%',
        left: '20%',
        right: '10%',
      },
      xAxis: {
        type: 'category',
        data: variableNames,
        splitArea: { show: true },
        axisLabel: { rotate: 30 },
      },
      yAxis: {
        type: 'category',
        data: componentNames,
        splitArea: { show: true },
      },
      axisLabel: {
        fontSize: 14,
        rotate: 30
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'vertical',
        left: '95%',
        top: 'center',
      },
      series: [
        {
          name: 'Eigenvector weights',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: true,
            fontSize: 14,
            formatter: (params: any) => params.value[2]?.toFixed(2),
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    },
  ];
}
