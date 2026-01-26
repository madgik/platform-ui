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
  const labelCharsPerLine = 10;
  const maxLabelLength = bins.reduce((max, b) => Math.max(max, String(b).length), 0);
  const estimatedLines = Math.max(1, Math.ceil(maxLabelLength / labelCharsPerLine));
  const needsRotate = bins.length > 8 || maxLabelLength > labelCharsPerLine;
  const bottomMargin = Math.max(
    70,
    baseMargins.bottom + estimatedLines * 16 + (needsRotate ? 22 : 8)
  );

  // Left margin = base + label width + small padding
  const margin = {
    top: baseMargins.top,
    right: baseMargins.right,
    bottom: bottomMargin,
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

  function wrapTickText(
    textSelection: d3.Selection<SVGTextElement, any, SVGGElement, unknown>,
    maxChars: number
  ) {
    textSelection.each(function () {
      const text = d3.select(this);
      const raw = text.text();
      if (!raw) return;

      const words = raw.split(/\s+/).filter(Boolean);
      const lines: string[] = [];

      if (words.length <= 1) {
        const chunks = raw.match(new RegExp(`.{1,${maxChars}}`, 'g'));
        if (chunks) {
          lines.push(...chunks);
        } else {
          lines.push(raw);
        }
      } else {
        let line: string[] = [];
        words.forEach((word) => {
          const next = [...line, word].join(' ');
          if (next.length > maxChars && line.length) {
            lines.push(line.join(' '));
            line = [word];
          } else {
            line.push(word);
          }
        });
        if (line.length) lines.push(line.join(' '));
      }

      if (lines.length <= 1) return;

      text.text(null);
      lines.slice(0, 3).forEach((line, i) => {
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', i === 0 ? '0.35em' : '1.1em')
          .text(line);
      });
    });
  }

  // X axis
  const xAxis = d3
    .axisBottom(xScale)
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

  wrapTickText(tickText, labelCharsPerLine);

  // Y axis
  const yAxis = d3
    .axisLeft(yScale)
    .ticks(6)
    .tickFormat((d: any) => smartFormat(d));

  chart.append('g').call(yAxis);

  // Axis labels

  // X label: a bit closer to the ticks
  const xLabelOffset =
    (needsRotate ? 68 : 40) + Math.max(0, estimatedLines - 1) * 12;

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
