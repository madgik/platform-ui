import { EChartsOption } from 'echarts';

export function buildKMeansChart(output: any): EChartsOption[] {
  const centers = output?.centers;

  if (!Array.isArray(centers) || centers.length === 0) {
    console.warn('[KMeans] No centers provided.');
    return [];
  }

  const dims = centers[0].length;

  if (dims === 2) {
    return buildKMeans2DChart(centers);
  } else if (dims === 3) {
    return buildKMeans3DChart(centers);
  } else {
    console.warn(`[KMeans] Unsupported dimensionality: ${dims}`);
    return [];
  }
}

function buildKMeans2DChart(centers: [number, number][]): EChartsOption[] {
  const series = centers.map(([x, y]: [number, number], i: number) => ({
    name: `Cluster ${i + 1}`,
    type: 'scatter',
    data: [[x, y]],
    symbolSize: 20,
    label: {
      show: true,
      formatter: `Cluster ${i + 1}`,
      position: 'top',
    },
  }));

  return [
    {
      title: {
        text: 'K-Means Centers',
        left: 'center',
      },
      xAxis: {
        type: 'value',
        name: 'x',
      },
      yAxis: {
        type: 'value',
        name: 'y',
      },
      series: series as any,
    },
  ];
}

function buildKMeans3DChart(centers: [number, number, number][]): EChartsOption[] {
  const series: any[] = [
    {
      type: 'scatter3D',
      data: centers,
      symbolSize: 20,
      label: {
        // show: true,
        // formatter: (_: any, i: number) => `Cluster ${i + 1}`,
      },
    },
  ];

  return [
    {
      title: {
        text: 'K-Means Centers (3D)',
        left: 'center',
      },
      xAxis3D: {
        type: 'value',
        name: 'x',
      },
      yAxis3D: {
        type: 'value',
        name: 'y',
      },
      zAxis3D: {
        type: 'value',
        name: 'z',
      },
      grid3D: {
        boxWidth: 100,
        boxDepth: 100,
        light: {
          main: {
            intensity: 1.2,
          },
          ambient: {
            intensity: 0.3,
          },
        },
      },
      tooltip: {
        formatter: (params: any) => {
          const [x, y, z] = params.value;
          return `x: ${x}<br>y: ${y}<br>z: ${z}`;
        },
      },
      series: series as any, // 🔧 Type assertion to bypass TS type check
    },
  ];
}
