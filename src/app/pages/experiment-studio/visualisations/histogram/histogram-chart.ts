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

  // Base container dimensions
  const containerWidth = container.getBoundingClientRect().width;
  const containerHeight = Math.max(
    container.getBoundingClientRect().height,
    570
  );

  // Clear any existing chart
  container.innerHTML = '';

  // Create SVG once
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', containerHeight);

  // Measure Y-axis label to make left margin dynamic
  const yLabelText = 'Count';

  const tempLabel = svg
    .append('text')
    .attr('x', -9999)
    .attr('y', -9999)
    .style('font-size', '16px')
    .text(yLabelText);

  const yLabelBBox = (tempLabel.node() as SVGTextElement).getBBox();
  tempLabel.remove();

  const baseMargins = { top: 40, right: 30, bottom: 60, left: 50 };

  // Left margin = base + label width + small padding
  const margin = {
    top: baseMargins.top,
    right: baseMargins.right,
    bottom: 85,
    left: baseMargins.left + yLabelBBox.width + 16
  };

  const innerWidth = containerWidth - margin.left - margin.right;
  const innerHeight = containerHeight - margin.top - margin.bottom - 60;

  // Scales
  const xScale = d3
    .scaleBand()
    .domain(bins)
    .range([0, innerWidth])
    .padding(0.1);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(counts) || 0])
    .nice()
    .range([innerHeight, 0]);

  // Chart group
  const chart = svg
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Bars
  chart
    .selectAll('.bar')
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

    if ((abs > 0 && abs < 0.01) || abs > 10000) return d3.format('.2e')(d);
    if (Number.isInteger(d)) return d.toString();
    return d3.format('.2f')(d);
  }

  // X axis
  const xAxis = d3
    .axisBottom(xScale)
    .tickFormat((d: any) => {
      const num = parseFloat(d);
      return isNaN(num) ? d : smartFormat(num);
    });

  chart
    .append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(xAxis)
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .attr('font-size', '13px')
    .style('text-anchor', 'end');

  // Y axis
  const yAxis = d3
    .axisLeft(yScale)
    .ticks(6)
    .tickFormat((d: any) => smartFormat(d));

  chart.append('g').call(yAxis);

  // Axis labels

  // X label: a bit closer to the ticks
  const xLabelOffset = 52; // distance from x-axis to label

  chart
    .append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + xLabelOffset)
    .attr('text-anchor', 'middle')
    .text(data.variableName || 'Bins')
    .style('font-size', '16px');

  // Y label: uses dynamic margin so it never clips
  const yLabelPaddingFromAxis = 24; // distance between axis and label

  chart
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -margin.left + yLabelPaddingFromAxis)
    .attr('text-anchor', 'middle')
    .text(yLabelText)
    .style('font-size', '16px');
}
