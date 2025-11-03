import * as d3 from 'd3';

export function createHistogram(
  data: {
    bins: string[];
    counts: number[];
    variable?: string;
    variableName?: string;
    description?: string;
  },
  container: HTMLElement,
  config: { color?: string } = {}
): void {
  const { bins, counts } = data;
  const { color = '#00758c' } = config;

  // Dynamically calculate container dimensions
  const containerWidth = container.getBoundingClientRect().width;
  const containerHeight = Math.max(container.getBoundingClientRect().height, 570);

  const margin = { top: 50, right: 30, bottom: 90, left: 60 };
  const innerWidth = containerWidth - margin.left - margin.right;
  const innerHeight = containerHeight - margin.top - margin.bottom - 60;

  // Clear any existing chart
  container.innerHTML = '';

  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', containerHeight);

  // Scales
  const xScale = d3.scaleBand()
    .domain(bins)
    .range([0, innerWidth])
    .padding(0.1);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(counts) || 0])
    .nice()
    .range([innerHeight, 0]);

  // Chart group
  const chart = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Bars
  chart.selectAll('.bar')
    .data(counts)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', (_, i) => xScale(bins[i]) || 0)
    .attr('y', (d) => yScale(d))
    .attr('width', xScale.bandwidth())
    .attr('height', (d) => innerHeight - yScale(d))
    .attr('fill', color);

  // Smart number formatter
  function smartFormat(d: any): string {
    if (typeof d !== 'number' || isNaN(d)) return String(d);
    const abs = Math.abs(d);

    // very small or very large numbers → scientific notation
    if ((abs > 0 && abs < 0.01) || abs > 10000) return d3.format('.2e')(d);

    // integers → no decimals
    if (Number.isInteger(d)) return d.toString();

    // normal decimals → 2 digits max
    return d3.format('.2f')(d);
  }

  // X axis (bins)
  chart.append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(
      d3.axisBottom(xScale)
        .tickFormat((d: any) => {
          const num = parseFloat(d);
          return isNaN(num) ? d : smartFormat(num);
        })
    )
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .attr('font-size', '13px')
    .style('text-anchor', 'end');

  // Y axis (counts)
  chart.append('g')
    .call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat((d: any) => smartFormat(d))
    );

  // Axis labels
  chart.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + margin.bottom + 50)
    .attr('text-anchor', 'middle')
    .text(data.variableName || 'Bins')
    .style('font-size', '16px');

  chart.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .text('Count')
    .style('font-size', '18px');
}
