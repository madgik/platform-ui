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

  const padX = 3, padY = 5;

  const text = group
    .append('text')
    .attr('class', 'label')
    .attr('text-anchor', 'middle')
    .style('font-size', '9px')
    .style('font-weight', '500')
    .style('fill', '#222');

  text.selectAll('tspan')
    .data(splitText(d.data.name || ''))
    .join('tspan')
    .attr('x', 0)
    .attr('y', (_: any, i: number, nodes: unknown) => {
      const arr = nodes as any[];
      return `${i - arr.length / 2 + 0.8}em`;
    })
    .text((l: string) => l);

  if (!d.children) return;

  // Turns text bbox for background rect
  const tempSvg = d3.select('body')
    .append('svg')
    .attr('width', 0)
    .attr('height', 0)
    .style('position', 'absolute')
    .style('visibility', 'hidden');

  const tempText = tempSvg.append('text')
    .style('font-size', '10px')
    .style('font-weight', '500')
    .text(d.data.name || '');

  const bbox = tempText.node()?.getBBox();
  tempSvg.remove();
  if (!bbox) return;

  group
    .insert('rect', 'text')
    .attr('class', 'label-bg')
    .attr('x', -bbox.width / 2 - padX)
    .attr('y', -bbox.height / 2 - padY)
    .attr('width', bbox.width + padX * 2)
    .attr('height', bbox.height + padY * 2)
    .attr('rx', 3)
    .style('fill', 'white')
    .style('stroke', 'rgba(0, 0, 0, 0.2)')
    .style('stroke-width', 0.8)
    .style('opacity', 0.9);
}

// Get code/id from nodes
const codeOf = (x: any): string | undefined =>
  x?.code ?? x?.uniqueId ?? x?.id ??
  x?.data?.code ?? x?.data?.uniqueId ?? x?.data?.id ??
  x?.name;

// Turns input arrays into new Set<string> -- copies
const toCodeSet = (arr: any[] | undefined | null): Set<string> =>
  new Set(
    ([...(arr ?? [])] as any[]) // shallow copy
      .map(codeOf)
      .filter((v): v is string => !!v)
  );

// Calculate leaf color
const colorForLeaf = (
  d: any,
  sets: { vars: Set<string>; covs: Set<string>; filters: Set<string> }
): string => {
  const code = codeOf(d.data);
  if (!code) return 'white';
  if (sets.vars.has(code)) return '#37c0aeff'; // variable
  if (sets.covs.has(code)) return '#c88d00'; // covariate
  if (sets.filters.has(code)) return '#44bf00'; // filter
  // if (sets.vars.has(code)) return '#37c0aeff'; // variable
  // if (sets.covs.has(code)) return '#6ac467ff'; // covariate
  // if (sets.filters.has(code)) return '#7a5cb1ff'; // filter
  return 'white';
};

// MAIN FACTORY

export function createZoomableCirclePacking(
  data: any,
  container: HTMLElement,
  onNodeClick: (node: any) => void,
  options?: {
    selectedVariables?: any[];
    selectedCovariates?: any[];
    selectedFilters?: any[];
  }
): { zoomToNode: (d: any) => void; refreshColors: (opts?: any) => void } {

  // local snapshots, decouple references of the experiment studio service signals
  let sets = {
    vars: toCodeSet(options?.selectedVariables),
    covs: toCodeSet(options?.selectedCovariates),
    filters: toCodeSet(options?.selectedFilters),
  };

  const width = 700, height = 728;
  const color = d3.scaleLinear<string>()
    .domain([0, 5])
    .range(['hsl(152,80%,80%)', 'hsla(224, 51%, 43%, 1.00)'])
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
    .style('color', '#222')
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
    const label = d.data.name || '(no label)';
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
    .style('background', 'hsl(152,70%,88%)')
    .style('cursor', 'pointer')
    .attr(
      'style',
      `min-width: 100%; height: auto; display: block; margin: 0 -14px;
       background: hsl(152,70%,88%); cursor: pointer;`
    );

  // Nodes

  const node = svg.append('g')
    .selectAll('circle')
    .data(root.descendants().slice(1))
    .join('circle')
    .attr('class', (d: any) => (d.children ? 'group' : 'leaf'))
    .attr('fill', (d: any) => (d.children ? color(d.depth) : colorForLeaf(d, sets)))
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
    .on('mouseover', function (event, d) {
      d3.select(this).attr('stroke', '#000');
      showTooltip(event, d);
    })
    .on('mousemove', function (event) {
      moveTooltip(event);
    })
    .on('mouseout', function () {
      d3.select(this).attr('stroke', null);
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
    const k = width / v[2];
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
        if (d.parent === focus) {
          el.style('display', 'inline').style('fill-opacity', 1);
          createLabelGroup(el, d);
        } else el.style('display', 'none');
      });
  }

  function updateSelection() {
    node.transition().duration(200)
      .attr('fill', (d: any) => {
        if (d === selectedDataNode) return 'hsla(182,80%,56%,1)';
        if (d.children) return color(d.depth);
        return colorForLeaf(d, sets);
      })
      .attr('stroke', (d: any) => (d === selectedDataNode ? 'black' : 'none'))
      .attr('stroke-width', (d: any) => (d === selectedDataNode ? 2 : 0));
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
    const target = root.descendants().find((n: any) => n.data.code === dataNode.code);
    if (!target) return;

    const group = target.parent ?? root;
    const zoomTarget: [number, number, number] = [group.x, group.y, group.r * 2];

    labelNodes.each(function (nd: any) {
      const el = d3.select(this as SVGGElement);
      if (nd.parent === group) {
        el.style('display', 'inline').style('fill-opacity', 0.5);
        createLabelGroup(el, nd);
      } else el.style('display', 'none').style('fill-opacity', 0);
    });

    if (!view) {
      view = [root.x, root.y, root.r * 2];
    }

    // Ensure initial zoom executes even on first external call
    if (focus === root && !selectedDataNode) {
      zoomTo(zoomTarget);
      focus = group;
      selectedDataNode = target;
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
        selectedDataNode = target;
        updateSelection();

        labelNodes.each(function (nd: any) {
          const el = d3.select(this as SVGGElement);
          if (nd.parent === group) {
            el.style('display', 'inline')
              .transition()
              .duration(250)
              .style('fill-opacity', 1);
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
  }) {
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
        const newFill = colorForLeaf(d, sets);
        if (circle.attr('fill') !== newFill) {
          circle.attr('fill', newFill);
        }
      }
    });
  }

  return { zoomToNode, refreshColors };
}
