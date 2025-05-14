import * as d3 from 'd3';

export function createHistogram(
  data: { bins: string[]; counts: number[]; variable?: string; variableName?: string; description?: string },
  container: HTMLElement,
  config: { color?: string } = {}
): void {
  const { bins, counts, variable } = data;
  const { color = '#00758c' } = config;
  // Dynamically calculate the container dimensions
  const containerWidth = container.getBoundingClientRect().width;
  const containerHeight = Math.max(container.getBoundingClientRect().height, 570); // Use at least 400px

  const margin = { top: 50, right: 30, bottom: 90, left: 60 }; // Adjusted for labels
  const innerWidth = containerWidth - margin.left - margin.right;
  const innerHeight = containerHeight - margin.top - margin.bottom - 60;
  // Clear the container
  // Clear any existing chart
  container.innerHTML = '';
  // Create the SVG
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

  // Add bars
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

  // Add axes
  chart.append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .attr('font-size', '13px')
    .style('text-anchor', 'end');


  chart.append('g').call(d3.axisLeft(yScale));

  // Add axis labels
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
