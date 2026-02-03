import * as d3 from 'd3';

// helpers
// Splits labels
function splitText(text: string, max = 13): string[] {
  if (!text) return [];
  const bits = text.split(/[\s_]+/);
  const out: string[] = [];
  let cur = '';
  for (const w of bits) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur = cur + ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}

// Creates label + background rect
function createLabelGroup(group: d3.Selection<SVGGElement, any, any, any>, d: any) {
  group.selectAll('*').remove();

  const text = group
    .append('text')
    .attr('class', 'label')
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('font-weight', '600')
    .style('fill', '#0f172a')
    .style('paint-order', 'stroke')
    .style('stroke', 'rgba(255,255,255,0.9)')
    .style('stroke-width', 2)
    .style('stroke-linejoin', 'round');

  text.selectAll('tspan')
    .data(splitText(d.data.label || ''))
    .join('tspan')
    .attr('x', 0)
    .attr('y', (_: any, i: number, nodes: unknown) => {
      const arr = nodes as any[];
      return `${i - arr.length / 2 + 0.8}em`;
    })
    .text((l: string) => l);

  if (!d.children) return;
}

// Get code/id from nodes
const codeOf = (x: any): string | undefined =>
  x?.code ?? x?.uniqueId ?? x?.id ??
  x?.data?.code ?? x?.data?.uniqueId ?? x?.data?.id ??
  x?.label;

// Turns input arrays into new Set<string> -- copies
const toCodeSet = (arr: any[] | undefined | null): Set<string> =>
  new Set(
    ([...(arr ?? [])] as any[]) // shallow copy
      .map(codeOf)
      .filter((v): v is string => !!v)
  );

type BubbleColorConfig = {
  variable: string;
  covariate: string;
  filter: string;
  selected: string;
  groupStart: string;
  groupEnd: string;
};

const defaultColors: BubbleColorConfig = {
  variable: '#2b33e9',     // MIP dark_blue
  covariate: '#ffeeba',    // Muted pastel orange
  filter: '#c5d4f0',       // Muted pastel blue
  selected: '#1b21a3',     // MIP dark_blue darker
  groupStart: '#dfefe4',   // MIP light_green
  groupEnd: '#2b33e9',     // MIP dark_blue
};

// Calculate leaf color
const colorForLeaf = (
  d: any,
  sets: { vars: Set<string>; covs: Set<string>; filters: Set<string> },
  colors: BubbleColorConfig
): string => {
  const code = codeOf(d.data);
  if (!code) return 'white';
  if (sets.vars.has(code)) return colors.variable; // variable
  if (sets.covs.has(code)) return colors.covariate; // covariate
  if (sets.filters.has(code)) return colors.filter; // filter
  return 'white';
};

// MAIN FACTORY

export function createZoomableCirclePacking(
  data: any,
  container: HTMLElement,
  onNodeClick: (node: any) => void,
  onNodeDoubleClick: (node: any) => void,
  options?: {
    selectedVariables?: any[];
    selectedCovariates?: any[];
    selectedFilters?: any[];
    colors?: Partial<BubbleColorConfig>;
  }
): { zoomToNode: (d: any) => void; refreshColors: (opts?: any) => void; destroy?: () => void } {

  // local snapshots, decouple references of the experiment studio service signals
  let sets = {
    vars: toCodeSet(options?.selectedVariables),
    covs: toCodeSet(options?.selectedCovariates),
    filters: toCodeSet(options?.selectedFilters),
  };

  let colors: BubbleColorConfig = { ...defaultColors, ...(options?.colors ?? {}) };

  const bounds = container.getBoundingClientRect();
  const width = Math.max(320, Math.floor(bounds.width || 0)) || 700;
  const height = Math.max(320, Math.floor(bounds.height || 0)) || 728;
  const size = Math.min(width, height);
  let groupColor = d3.scaleLinear<string>()
    .domain([0, 5])
    .range([colors.groupStart, colors.groupEnd])
    .interpolate(d3.interpolateHcl);

  if (!container) {
    console.error('No container provided');
    return { zoomToNode: () => { }, refreshColors: () => { } };
  }
  container.innerHTML = '';

  // Tooltip setup
  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('padding', '6px 8px')
    .style('background', 'rgba(255,255,255,0.95)')
    .style('border', '1px solid rgba(0,0,0,0.2)')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('color', '#0f172a')
    .style('opacity', 0);

  function decodeUnicode(str: string): string {
    try {
      return str.replace(/\\u[\dA-Fa-f]{4}/g, (match) =>
        String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
      );
    } catch {
      return str;
    }
  }

  function showTooltip(event: MouseEvent, d: any) {
    const label = d.data.label || '(no label)';
    const descriptionRaw = d.data.description || '';
    const description = decodeUnicode(descriptionRaw.trim());
    const type = d.data.type || '';

    let html = `<div><strong>${label}</strong></div>`;
    if (type)
      html += `<div style="margin-top:4px;"><strong>Type:</strong> ${type}</div>`;
    if (description)
      html += `<div style="margin-top:4px;"><strong>Description:</strong> ${description}</div>`;

    tooltip
      .html(html)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY + 10}px`)
      .transition()
      .duration(150)
      .style('opacity', 1);
  }

  function moveTooltip(event: MouseEvent) {
    tooltip
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY + 10}px`);
  }

  function hideTooltip() {
    tooltip.transition().duration(150).style('opacity', 0);
  }

  const root = d3.pack<any>().size([width, height]).padding(3)(
    d3.hierarchy<any>(data, (d: any) => d.children)
      .sum((d: any) => d.value ?? 0)
      .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
  );

  let focus = root;
  let view: [number, number, number] = [focus.x, focus.y, focus.r * 2];
  let selectedDataNode: d3.HierarchyNode<any> | null = null;

  const svg = d3
    .create('svg')
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`)
    .attr('width', width)
    .attr('height', height)
    .style('display', 'block')
    .style('margin', '0')
    .style('cursor', 'pointer')
    .attr(
      'style',
      `width: 100%; height: 100%; display: block; margin: 0;
       background: transparent; cursor: pointer;`
    );

  const defs = svg.append('defs');
  defs.append('filter')
    .attr('id', 'node-glow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%')
    .append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 0)
    .attr('stdDeviation', 2.5)
    .attr('flood-color', 'rgba(0,0,0,0.35)');

  // Nodes
  const node = svg.append('g')
    .selectAll('circle')
    .data(root.descendants().slice(1))
    .join('circle')
    .attr('class', (d: any) => (d.children ? 'group' : 'leaf'))
    .attr('fill', (d: any) => (d.children ? groupColor(d.depth) : colorForLeaf(d, sets, colors)))
    .attr('fill-opacity', (d: any) => (d.children ? 0.6 : 1))
    .attr('stroke', (d: any) => (d.children ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.12)'))
    .attr('stroke-width', (d: any) => (d.children ? 1 : 0.6))
    .style('cursor', 'pointer')
    .on('click', (event: MouseEvent, d: any) => {
      event.stopPropagation();
      if (!d.children) {
        selectedDataNode = d;
        onNodeClick(d.data);
        updateSelection();
        return;
      }
      zoom(event, d);
    })
    .on('dblclick', (event: MouseEvent, d: any) => {
      event.stopPropagation();
      if (!d.children) {
        onNodeDoubleClick(d.data);
      }
    })
    .on('mouseover', function (event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('stroke', '#000')
        .attr('stroke-width', 2)
        .attr('filter', 'url(#node-glow)');
      showTooltip(event, d);
    })
    .on('mousemove', function (event) {
      moveTooltip(event);
    })
    .on('mouseout', function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('stroke', (d: any) => (d.children ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.12)'))
        .attr('stroke-width', (d: any) => (d.children ? 1 : 0.6))
        .attr('filter', 'none');
      updateSelection();
      hideTooltip();
    });


  // Labels
  const labelsGroup = svg.append('g').attr('pointer-events', 'none');
  const labelNodes = labelsGroup
    .selectAll('g.label-group')
    .data(root.descendants())
    .join('g')
    .attr('class', 'label-group')
    .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    .style('display', (d: any) => (d.parent === focus ? 'inline' : 'none'));

  zoomTo([focus.x, focus.y, focus.r * 2]);
  container.appendChild(svg.node()!);

  // Functions
  function zoomTo(v: [number, number, number]) {
    const k = size / v[2];
    view = v;

    node
      .attr('transform', (d: any) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`)
      .attr('r', (d: any) => d.r * k);

    labelNodes
      .attr('transform', (d: any) =>
        d.children
          ? `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k - d.r * k - 8})`
          : `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
      )
      .each(function (d: any) {
        const el = d3.select(this as SVGGElement);
        if (d.parent === focus && shouldShowLabel(d, k)) {
          el.style('display', 'inline').style('fill-opacity', 0.92);
          createLabelGroup(el, d);
        } else el.style('display', 'none');
      });
  }

  function updateSelection() {
    node.transition().duration(200)
      .attr('fill', (d: any) => {
        if (d === selectedDataNode) return colors.selected;
        if (d.children) return groupColor(d.depth);
        return colorForLeaf(d, sets, colors);
      })
      .attr('fill-opacity', (d: any) => (d.children ? 0.6 : 1))
      .attr('stroke', (d: any) => {
        if (d === selectedDataNode) return '#000';
        if (d.children) return 'rgba(0,0,0,0.08)';
        return 'rgba(0,0,0,0.12)';
      })
      .attr('stroke-width', (d: any) => {
        if (d === selectedDataNode) return 2;
        if (d.children) return 1;
        return 0.6;
      })
      .attr('filter', (d: any) => (d === selectedDataNode ? 'url(#node-glow)' : 'none'));
  }

  function zoom(event: MouseEvent, d: any) {
    focus = d;
    onNodeClick(d.data);

    svg.transition()
      .duration(event.altKey ? 7500 : 750)
      .tween('zoom', () => {
        const i = d3.interpolateZoom(view, [d.x, d.y, d.r * 2]);
        return (t: number) => zoomTo(i(t));
      })
      .on('end', () => {
        selectedDataNode = null;
        updateSelection();
      });
  }

  function zoomToNode(dataNode: any) {
    const code = dataNode?.code ?? dataNode;  // accepts {code} or "code"

    const target = root.descendants().find((n: any) => n.data.code === code);
    if (!target) return;

    // if group -> zoom to group
    // if leaf  -> zoom to parent
    const group = target.children ? target : (target.parent ?? root);

    const zoomTarget: [number, number, number] = [group.x, group.y, group.r * 2];

    labelNodes.each(function (nd: any) {
      const el = d3.select(this as SVGGElement);
      if (nd.parent === group && shouldShowLabel(nd, size / zoomTarget[2])) {
        el.style('display', 'inline').style('fill-opacity', 0.6);
        createLabelGroup(el, nd);
      } else el.style('display', 'none').style('fill-opacity', 0);
    });

    if (!view) view = [root.x, root.y, root.r * 2];

    if (focus === root && !selectedDataNode) {
      zoomTo(zoomTarget);
      focus = group;
      selectedDataNode = target.children ? null : target; // group -> null
      updateSelection();
    }

    svg.transition()
      .duration(750)
      .tween('zoom', () => {
        const i = d3.interpolateZoom(view, zoomTarget);
        return (t: number) => zoomTo(i(t));
      })
      .on('end', () => {
        focus = group;
        selectedDataNode = target.children ? null : target; // group -> null
        updateSelection();

        labelNodes.each(function (nd: any) {
          const el = d3.select(this as SVGGElement);
          if (nd.parent === group && shouldShowLabel(nd, size / zoomTarget[2])) {
            el.style('display', 'inline')
              .transition()
              .duration(250)
              .style('fill-opacity', 0.92);
          } else el.style('display', 'none').style('fill-opacity', 0);
        });
      });
  }

  svg.on('click', function (event: MouseEvent) {
    if (event.target === this) zoom(event, root);
  });

  // immutable refreshColors
  function refreshColors(newOptions?: {
    selectedVariables?: any[];
    selectedCovariates?: any[];
    selectedFilters?: any[];
    colors?: Partial<BubbleColorConfig>;
  }) {
    colors = { ...colors, ...(newOptions?.colors ?? {}) };
    groupColor = d3.scaleLinear<string>()
      .domain([0, 5])
      .range([colors.groupStart, colors.groupEnd])
      .interpolate(d3.interpolateHcl);

    // Updates global snapshot
    sets = {
      vars: new Set(
        [...(newOptions?.selectedVariables ?? [])]
          .map(codeOf)
          .filter((v): v is string => !!v)
      ),
      covs: new Set(
        [...(newOptions?.selectedCovariates ?? [])]
          .map(codeOf)
          .filter((v): v is string => !!v)
      ),
      filters: new Set(
        [...(newOptions?.selectedFilters ?? [])]
          .map(codeOf)
          .filter((v): v is string => !!v)
      ),
    };

    // Updates leaf node colors based on the new snapshot
    node.each(function (d: any) {
      const circle = d3.select(this);
      if (!d.children) {
        const newFill = colorForLeaf(d, sets, colors);
        if (circle.attr('fill') !== newFill) {
          circle.attr('fill', newFill);
        }
      } else {
        circle.attr('fill', groupColor(d.depth));
      }
    });
    updateSelection();
  }

  function shouldShowLabel(d: any, k: number): boolean {
    if (!d.children) return false;
    const radius = d.r * k;
    if (radius < 16) return false;
    const lines = splitText(d.data.label || '');
    const maxLine = lines.reduce((acc, l) => Math.max(acc, l.length), 0);
    const approxTextWidth = maxLine * 6;
    return approxTextWidth <= radius * 2.1;
  }

  return { zoomToNode, refreshColors, destroy: () => { } };
}
