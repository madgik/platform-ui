import * as d3 from 'd3';
import { HierarchyPointNode, HierarchyPointLink } from 'd3-hierarchy';

export function createTidyTree(data: any, container: HTMLElement, onNodeClick: (node: any) => void): void {
  const width = 1500;

  const root = d3.hierarchy(data);
  const dx = 10;
  const dy = width / (root.height + 1);

  const tree = d3.cluster<HierarchyPointNode<any>>().nodeSize([dx, dy]);

  root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
  tree(root);

  let x0 = Infinity;
  let x1 = -x0;

  root.each((d) => {
    if (typeof d.x === "number") {
      x0 = Math.min(x0, d.x);
      x1 = Math.max(x1, d.x);
    }
  });

  const height = x1 - x0 + dx * 2;

  // Create an SVG element
  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-dy / 3, x0 - dx, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  // The main group that will be zoomed and panned
  const g = svg.append("g");

  // Define zoom behavior
  const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 4])  // Define zoom scale limits
    .on("zoom", (event) => {
      g.attr("transform", event.transform);  // Apply zoom and pan transformations
    });

  // Apply zoom behavior to the SVG, with an explicit cast to `any`
  svg.call(zoomBehavior as any);

  g.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("d", d3.linkHorizontal<HierarchyPointLink<any>, HierarchyPointNode<any>>()
      .x(d => d.y)
      .y(d => d.x) as any);

  const node = g.append("g")
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", d => `translate(${d.y},${d.x})`)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      onNodeClick(d.data);
    });  // Make each node clickable

  node.append("circle")
    .attr("fill", d => d.children ? "#555" : "#999")
    .attr("r", 2.5);

  node.append("text")
    .attr("dy", "0.31em")
    .attr("x", d => d.children ? -6 : 6)
    .attr("text-anchor", d => d.children ? "end" : "start")
    .text(d => d.data.name)
    .attr("stroke", "white")
    .attr("paint-order", "stroke");

  if (svg.node() !== null) {
    container.appendChild(svg.node() as Node);
  }
}
