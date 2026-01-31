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
  config: {
    color?: string;
    skipEveryOtherLabel?: boolean;
  } = {}
): void {
  const { bins, counts } = data;
  const {
    color = '#00758c',
    skipEveryOtherLabel = false,
  } = config;

  // Base container dimensions
  const containerRect = container.getBoundingClientRect();
  const containerWidth = containerRect.width || 0;
  const containerHeight = Math.max(containerRect.height || 0, 360);

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
  const labelCharsPerLine = 10;
  const maxLabelLength = bins.reduce((max, b) => Math.max(max, String(b).length), 0);
  const estimatedLines = Math.max(1, Math.ceil(maxLabelLength / labelCharsPerLine));
  const hasStringBins = bins.some((b) => isNaN(parseFloat(String(b))));
  const hasLongNumericBins = bins.some((b) => {
    const raw = String(b).trim();
    if (!raw) return false;
    const num = Number(raw);
    if (Number.isNaN(num)) return false;
    return raw.length >= 4 && raw.includes('.');
  });
  const needsRotate = hasStringBins || hasLongNumericBins;
  const rotateExtra = needsRotate ? 22 : 0;
  const bottomMargin = Math.max(
    70,
    baseMargins.bottom + estimatedLines * 16 + rotateExtra
  );
  const effectiveHeight = containerHeight;

  // Left margin = base + label width + small padding
  const margin = {
    top: baseMargins.top,
    right: baseMargins.right,
    bottom: bottomMargin,
    left: baseMargins.left + yLabelBBox.width + 16
  };

  // Scale width by bin count to allow horizontal scrolling when needed
  const minPerBinWidth = hasStringBins ? 30 : 20;
  const desiredWidth = Math.max(containerWidth, bins.length * minPerBinWidth);

  svg.attr('width', desiredWidth).attr('height', effectiveHeight);

  const innerWidth = desiredWidth - margin.left - margin.right;
  const innerHeight = effectiveHeight - margin.top - margin.bottom - 60;

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

    if (Number.isInteger(d)) return d.toString();
    if (abs > 10000) return d3.format('.2f')(d);
    if (abs > 0 && abs < 0.01) return d3.format('.2e')(d);
    return d3.format('.2f')(d);
  }

  // X axis
  const xAxis = d3
    .axisBottom(xScale)
    .tickValues(bins)
    .tickFormat((d: any) => {
      const num = parseFloat(d);
      return isNaN(num) ? d : smartFormat(num);
    });

  const xAxisGroup = chart
    .append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(xAxis);

  const tickText = xAxisGroup
    .selectAll<SVGTextElement, any>('text')
    .attr('font-size', '13px')
    .style('text-anchor', needsRotate ? 'end' : 'middle');

  if (needsRotate) {
    tickText.attr('transform', 'rotate(-35)');
  }

  // Keep labels on a single line; rely on rotation + scrolling for space.

  // Y axis
  const yAxis = d3
    .axisLeft(yScale)
    .ticks(6)
    .tickFormat((d: any) => smartFormat(d));

  chart.append('g').call(yAxis);

  // Axis labels

  // X label intentionally omitted (avoid repeating node name under histogram)

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
