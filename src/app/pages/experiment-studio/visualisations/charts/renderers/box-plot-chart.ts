import { EChartsOption } from 'echarts';

// Builds a Box Plot chart (Q1–Q3 boxes + min/max whiskers + mean dots)
// for descriptive statistics results.
export function buildBoxPlotChart(result: any): EChartsOption[] {
  const variable_based = result?.result?.variable_based ?? result?.variable_based ?? [];
  if (!Array.isArray(variable_based) || variable_based.length === 0) return [];

  const firstVariable = variable_based[0]?.variable ?? 'Variable';
  const filtered = variable_based.filter(v => v.variable === firstVariable);

  // datasets (x-axis)
  const datasets = filtered.map(v => v.dataset ?? 'all datasets');

  // Extract Q1, Q3, median, min, max, mean
  const boxData = filtered.map(v => {
    const d = v.data ?? {};
    return [d.min, d.q1, d.q2, d.q3, d.max];
  });

  const meanPoints = filtered.map((v, idx) => {
    const mean = v.data?.mean ?? null;
    return mean != null ? [idx, mean] : null;
  }).filter(Boolean) as [number, number][];

  const chart: EChartsOption = {
    title: {
      text: `Distribution for ${firstVariable}`,
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        if (Array.isArray(p.value)) {
          const [min, q1, median, q3, max] = p.value;
          return `
            <b>${datasets[p.dataIndex]}</b><br/>
            Min: ${min}<br/>
            Q1: ${q1}<br/>
            Median: ${median}<br/>
            Q3: ${q3}<br/>
            Max: ${max}
          `;
        } else {
          return `${datasets[p.value[0]]}<br/>Mean: ${p.value[1]}`;
        }
      },
    },
    grid: { left: '10%', right: '10%', bottom: '10%', top: '15%' },
    xAxis: {
      type: 'category',
      data: datasets,
      boundaryGap: true,
      name: 'Dataset',
      nameLocation: 'middle',
      nameGap: 25,
    },
    yAxis: {
      type: 'value',
      name: 'Value',
      nameLocation: 'middle',
      nameGap: 35,
    },
    series: [
      {
        name: 'Boxplot',
        type: 'boxplot',
        data: boxData,
        itemStyle: {
          color: 'rgba(43, 51, 233, 0.3)',      // MIP primary with transparency
          borderColor: '#2b33e9',               // MIP dark_blue
        },
        boxWidth: [20, 30],
      },
      {
        name: 'Mean',
        type: 'scatter',
        data: meanPoints,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#ffba08' },         // MIP orange for mean
      },
    ],
  };

  return [chart];
}
