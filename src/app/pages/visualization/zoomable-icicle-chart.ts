import * as d3 from 'd3';
import {VisualizationComponent} from "./visualization.component";

export function createIcicleChart(data: any, container: HTMLElement, component: VisualizationComponent): void {
  const width = 928;
  const height = 600;

  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

  const root = d3.hierarchy(data)
    .sum((d: any) => d.value ?? 0)
    .sort((a, b) => b.height - a.height || (b.value ?? 0) - (a.value ?? 0));

  const partition = d3.partition().size([height, (root.height + 1) * width / 3]);
  partition(root);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .style("font", "10px sans-serif");

  let focus = root; // Start with the root as the focused node

  const cell = svg.selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", (d: any) => `translate(${d.y0},${d.x0})`)
    .on("click", (event: MouseEvent, d: any) => {
      component.setSelectedNode(d);
    });


  cell.append("rect")
    .attr("width", (d: any) => d.y1 - d.y0 - 1)
    .attr("height", (d: any) => rectHeight(d))
    .attr("fill", (d: any) => {
      while (d.depth > 1) d = d.parent;
      return color(d.data.name);
    })
    .attr("fill-opacity", 0.6)
    .on("click", (event: any, p: any) => clicked(p));

  cell.append("text")
    .attr("x", 4)
    .attr("y", 13)
    .attr("fill-opacity", (d: any) => labelVisible(d))
    .text((d: any) => d.data.name);

  function clicked(p: any) {
    // If clicking the same node, zoom out to the parent
    focus = focus === p ? (p.parent || p) : p;

    root.each((d: any) => {
      d.target = transformNode(d, focus);
    });

    const t = cell.transition().duration(750)
      .attr("transform", (d: any) => `translate(${d.target.y0},${d.target.x0})`);

    cell.select("rect").transition(t)
      .attr("height", (d: any) => rectHeight(d.target));

    cell.select("text").transition(t)
      .attr("fill-opacity", (d: any) => labelVisible(d.target));
  }

  function rectHeight(d: any): number {
    return d.x1 - d.x0 - Math.min(1, (d.x1 - d.x0) / 2);
  }

  function labelVisible(d: any): boolean {
    return d.y1 <= width && d.x1 - d.x0 > 16;
  }

  function transformNode(d: any, focus: any): any {
    return {
      x0: ((d.x0 - focus.x0) / (focus.x1 - focus.x0)) * height,
      x1: ((d.x1 - focus.x0) / (focus.x1 - focus.x0)) * height,
      y0: d.y0 - focus.y0,
      y1: d.y1 - focus.y0,
    };
  }

  // Append the SVG to the container, with a null check
  if (svg.node() !== null) {
    container.appendChild(svg.node() as Node);
  }
}
