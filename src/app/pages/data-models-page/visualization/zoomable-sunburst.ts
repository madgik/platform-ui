import * as d3 from 'd3';

interface ArcNode extends d3.HierarchyRectangularNode<any> {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    current: ArcNode;
    target: ArcNode;
}

export function createSunburst(data: any, container: HTMLElement, onNodeClick: (node: any) => void): void {
  // Clear the container completely to ensure a fresh start
  container.innerHTML = "";

  const width = 928;
  const height = 928;
  const radius = width / 6;

  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

  const hierarchy = d3.hierarchy(data)
    .sum(d => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const root = d3.partition<ArcNode>().size([2 * Math.PI, hierarchy.height + 1])(hierarchy as any);
  root.each(d => (d as ArcNode).current = d as ArcNode);

  const arc = d3.arc<ArcNode>()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

  const svg = d3.create("svg")
    .attr("width", width) // Set the width of the SVG
    .attr("height", height) // Set the height of the SVG
    .attr("viewBox", [-width / 2, -height / 2, width, height]) // Adjust viewBox to match dimensions
    .style("font", "10px sans-serif");

  let path = svg.append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
    .attr("fill", d => {
      let node = d as ArcNode;
      while (node.depth > 1) node = node.parent as ArcNode;
      return color(node.data.name);
    })
    .attr("fill-opacity", d => arcVisible((d as ArcNode).current) ? ((d as ArcNode).children ? 0.6 : 0.4) : 0)
    .attr("pointer-events", d => arcVisible((d as ArcNode).current) ? "auto" : "none")
    .attr("d", d => arc((d as ArcNode).current))
    .style("cursor", "pointer")
    .on("click", (event: any, d: any) => {
      onNodeClick(d.data);
      clicked(event, d as ArcNode);
    });

  path.append("title")
    .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${d.value}`);

  let label = svg.append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
    .attr("dy", "0.35em")
    .attr("fill-opacity", d => +labelVisible((d as ArcNode).current))
    .attr("transform", d => labelTransform((d as ArcNode).current))
    .text(d => d.data.name);

  const parent = svg.append("circle")
    .datum(root)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("click", (event) => clicked(event, root as ArcNode));

  function clicked(event: MouseEvent, p: ArcNode) {
    // Check if the node has children; if not, return early
    if (!p.children) return;

    parent.datum(p.parent || root);

    root.each(d => (d as ArcNode).target = {
      x0: Math.max(0, Math.min(1, ((d as ArcNode).x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, ((d as ArcNode).x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, (d as ArcNode).y0 - p.depth),
      y1: Math.max(0, (d as ArcNode).y1 - p.depth)
    } as ArcNode);

    // Update paths with new data and transitions
    path = svg.selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", d => {
        let node = d as ArcNode;
        while (node.depth > 1) node = node.parent as ArcNode;
        return color(node.data.name);
      })
      .attr("fill-opacity", d => arcVisible((d as ArcNode).target) ? ((d as ArcNode).children ? 0.6 : 0.4) : 0)
      .attr("pointer-events", d => arcVisible((d as ArcNode).target) ? "auto" : "none")
      .attr("d", d => arc((d as ArcNode).current) ?? "")
      .style("cursor", "pointer");

    path.transition()
      .duration(750)
      .attrTween("d", function(d) {
        const i = d3.interpolate((d as ArcNode).current, (d as ArcNode).target);
        return t => arc(i(t)) ?? ""; // Handle potential null values
      })
      .attr("fill-opacity", d => arcVisible((d as ArcNode).target) ? ((d as ArcNode).children ? 0.6 : 0.4) : 0);

    label = svg.selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", d => +labelVisible((d as ArcNode).target))
      .attr("transform", d => labelTransform((d as ArcNode).target))
      .text(d => d.data.name);

    label.transition()
      .duration(750)
      .attrTween("transform", function(d) {
        const i = d3.interpolate((d as ArcNode).current, (d as ArcNode).target);
        return t => labelTransform(i(t));
      })
      .attr("fill-opacity", d => +labelVisible((d as ArcNode).target));
  }

  if (svg.node()) {
    container.appendChild(svg.node() as Node);
  }

  function arcVisible(d: ArcNode) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d: ArcNode) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d: ArcNode) {
    const x = ((d.x0 + d.x1) / 2) * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }
}
