
import { EChartsOption } from 'echarts';

export function buildLogRegConfusionChart(result: any): EChartsOption[] {
  const cm = result?.confusion_matrix;
  if (!cm || cm.tp === undefined || cm.fp === undefined || cm.fn === undefined || cm.tn === undefined) {
    console.warn('[LogisticConfusionChart] Invalid confusion_matrix');
    return [];
  }

  const labels = ['Positive', 'Negative'];
  const data = [
    [cm.tp, cm.fp],
    [cm.fn, cm.tn]
  ];

  const heatmapData: [number, number, number][] = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      heatmapData.push([j, i, data[i][j]]);
    }
  }

  return [{
    title: { text: 'Confusion Matrix', left: 'center' },
    tooltip: {
      formatter: (params: any) => {
        const val = params.value[2];
        const actual = labels[params.value[1]];
        const predicted = labels[params.value[0]];
        return `Predicted: ${predicted}<br/>Actual: ${actual}<br/>Count: ${val}`;
      }
    },
    grid: { top: '15%', bottom: '10%', left: '20%', right: '10%' },
    xAxis: {
      type: 'category',
      data: labels,
      name: 'Predicted',
      nameLocation: 'middle',
      nameGap: 30,
    },
    yAxis: {
      type: 'category',
      data: labels,
      name: 'Actual',
      nameLocation: 'middle',
      nameGap: 40,
    },
    axisLabels: {
      fontSize: 14,
      rotate: 30
    },
    visualMap: {
      min: 0,
      max: Math.max(...heatmapData.map(d => d[2])),
      calculable: true,
      orient: 'vertical',
      left: '90%',
      top: 'middle'
    },
    series: [{
      type: 'heatmap',
      data: heatmapData,
      label: {
        show: true,
        fontSize: 14,
        formatter: (params: any) => params.value[2]
      },
      emphasis: {
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1
        }
      }
    }]
  }];
}
