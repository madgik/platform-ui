import { EChartsOption } from 'echarts';

export function buildMatrixChart(result: any): EChartsOption[] {
  const matrix = result.correlations;

  const cols: string[] = matrix?.variables ?? [];
  const rows: string[] = Object.keys(matrix).filter(k => k !== 'variables');

  if (!cols.length || !rows.length) {
    console.warn('[MatrixChart] Empty rows or cols');
    return [];
  }

  const heatmapData: [number, number, number][] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowVar = rows[i];
    const values = matrix[rowVar];

    if (!Array.isArray(values)) continue;

    for (let j = 0; j < cols.length; j++) {
      const colVar = cols[j];
      const value = values[j];

      if (value !== null && value !== undefined) {
        heatmapData.push([j, i, value]);
      }
    }
  }

  return [
    {
      tooltip: { position: 'top' },
      grid: { height: '80%', top: '10%', left: '30%', right: '10%' },
      xAxis: {
        type: 'category',
        data: cols,
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: rows,
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
        left: '90%',
        top: 'center',
      },
      series: [
        {
          name: 'Correlation',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: true,
            fontSize: 14,
            formatter: (params: any) => params.value[2]?.toFixed(2)
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
  ]
}
