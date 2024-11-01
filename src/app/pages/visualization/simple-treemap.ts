import * as d3 from 'd3';
import {VisualizationComponent} from "./visualization.component";

export function createSimpleTreemap(data: any, container: HTMLElement, component: VisualizationComponent): void {
  const width = 928;
  const height = 924;

  const color = d3.scaleOrdinal(data.children.map((d: any) => d.name), d3.schemeTableau10);

  const root = d3.treemap()
    .tile(d3.treemapSquarify)
    .size([width, height])
    .padding(1)
    .round(true)
    (d3.hierarchy(data)
      .sum((d: any) => d.value)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)));

  const svg = d3.create("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("font", "10px sans-serif");

  const leaf = svg.selectAll("g")
    .data(root.leaves())
    .join("g")
    .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`)
    .on("click", (event: MouseEvent, d: any) => {
      component.setSelectedNode(d);
    });

  const format = d3.format(",d");
  leaf.append("title")
    .text((d: any) => `${d.ancestors().reverse().map((d: any) => d.data.name).join(".")}\n${format(d.value)}`);

  leaf.append("rect")
    .attr("id", (d: any) => {
      d.leafUid = `leaf-${d.data.name}-${Math.random().toString(36).substring(2, 7)}`;
      return d.leafUid;
    })
    .attr("fill", (d: any) => {
      let parentData = d;
      while (parentData.depth > 1) parentData = parentData.parent;
      return color(parentData.data.name);
    })
    .attr("fill-opacity", 0.6)
    .attr("width", (d: any) => d.x1 - d.x0)
    .attr("height", (d: any) => d.y1 - d.y0)
    .attr("stroke", "#fff");

  leaf.append("clipPath")
    .attr("id", (d: any) => {
      d.clipUid = `clip-${d.data.name}-${Math.random().toString(36).substring(2, 7)}`;
      return d.clipUid;
    })
    .append("use")
    .attr("xlink:href", (d: any) => `#${d.clipUid}`);


  leaf.append("text")
    .attr("clip-path", (d: any) => `url(#${d.clipUid})`)
    .selectAll("tspan")
    .data((d: any) => d.data.name.split(/(?=[A-Z][a-z])|\s+/g).concat(d.value.toString()))
    .join("tspan")
    .attr("x", 3)
    .attr("y", (d: any, i: any, nodes: any) => {
      const offset = (i === nodes.length - 1 ? 0.3 : 1.1) + i * 0.9;
      return `${offset}em`;
    })
    .attr("fill-opacity", (d: any, i: any, nodes: any) => (i === nodes.length - 1 ? 0.7 : null))
    .text((d: any) => d);


  // Append the SVG to the container, with a null check
  if (svg.node() !== null) {
    container.appendChild(svg.node() as Node);
  }
}
