import { EChartsOption } from 'echarts';

export function buildNaiveBayesConfusionChart(result: any): EChartsOption[] {
  const matrix = result?.confusion_matrix?.data;
  const labels = result?.confusion_matrix?.labels;

  if (!Array.isArray(matrix) || !Array.isArray(labels)) {
    console.warn('[NaiveBayesChart] Invalid confusion matrix structure');
    return [];
  }

  const heatmapData: [number, number, number][] = [];

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      heatmapData.push([j, i, matrix[i][j]]); // [predicted, actual, value]
    }
  }

  return [
    {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const [x, y, val] = params.value;
          return `Actual: ${labels[y]}<br/>Predicted: ${labels[x]}<br/>Count: ${val}`;
        },
      },
      grid: {
        height: '80%',
        top: '10%',
        left: '20%', // Increased to prevent overlap
        right: '10%',
        containLabel: true, // Ensures labels are calculated in grid size
      },
      xAxis: {
        type: 'category',
        data: labels,
        name: 'Predicted',
        nameLocation: 'middle',
        nameGap: 30,
        splitArea: { show: true },
        axisLabel: {
          fontSize: 14,
          rotate: 30,
          interval: 0 // Force show all
        },
      },
      yAxis: {
        type: 'category',
        data: labels,
        name: 'Actual',
        nameLocation: 'middle',
        nameGap: 70, // Increased gap
        splitArea: { show: true },
        axisLabel: {
          fontSize: 14,
          rotate: 30,
          interval: 0 // Force show all
        }
      },
      visualMap: {
        min: 0,
        max: Math.max(...matrix.flat()),
        calculable: true,
        orient: 'vertical',
        left: '95%',
        top: 'center',
      },
      series: [
        {
          name: 'Confusion Matrix',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: true,
            formatter: (params: any) => `${params.value[2]}`,
            color: '#000',
            fontSize: 14,
          },
          emphasis: {
            itemStyle: {
              borderColor: '#333',
              borderWidth: 1,
            },
          },
        },
      ],
    },
  ];
}
