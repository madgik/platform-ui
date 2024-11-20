import * as d3 from "d3";
import {VisualizationComponent} from "./visualization.component";

export function createZoomableTreemap(data: any, container: HTMLElement, component: VisualizationComponent): void {
  const width = 1154;
  const height = 1154;
  const breadcrumbHeight = 30;

  const color = d3.scaleOrdinal(data.children.map((d: any) => d.name), d3.schemeTableau10);
  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([0, height - breadcrumbHeight]);

  const root = d3.hierarchy(data)
    .sum((d: any) => d.value ?? 1)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  d3.treemap().tile(d3.treemapSquarify).size([width, height - breadcrumbHeight]).padding(1)(root);
  const rootWithLayout = root as d3.HierarchyRectangularNode<any>;

  const svg = d3.create("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height)
    .style("font", "10px sans-serif");

  const breadcrumbContainer = svg.append("g")
    .attr("class", "breadcrumb")
    .attr("transform", `translate(0, 0)`);

  let group = svg.append("g")
    .attr("transform", `translate(0, ${breadcrumbHeight})`)
    .call(render, rootWithLayout);

  function render(group: any, root: d3.HierarchyRectangularNode<any>) {
    updateBreadcrumb(root);

    const node = group.selectAll("g")
      .data(root.children)
      .join("g")
      .attr("cursor", (d: any) => (d.children ? "pointer" : "default"))
      .on("click", (event: any, d: any) => {
        component.setSelectedNode(d);
        if (d.children) {
          zoomin(d);
        }
      });

    node.append("title")
      .text((d: any) => `${d.ancestors().reverse().map((d: any) => d.data.name).join(".")}\n${d.value}`);

    node.append("rect")
      .attr("fill", (d: any) => {
        let parentData = d;
        while (parentData.depth > 1) parentData = parentData.parent;
        return color(parentData.data.name);
      })
      .attr("fill-opacity", 0.6)
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("stroke", "#fff");

    node.append("text")
      .attr("font-weight", (d: any) => (d === root ? "bold" : null))
      .selectAll("tspan")
      .data((d: any) => d.data.name.split(/(?=[A-Z][a-z])|\s+/g))
      .join("tspan")
      .attr("x", 3)
      .attr("y", (d: any, i: number, nodes: any) => `${i * 1.2 + 1}em`)
      .text((d: any) => d);

    group.call(position, root);
  }

  function position(group: any, root: d3.HierarchyRectangularNode<any>) {
    group.selectAll("g")
      .attr("transform", (d: any) => `translate(${x(d.x0)},${y(d.y0)})`)
      .select("rect")
      .attr("width", (d: any) => x(d.x1) - x(d.x0))
      .attr("height", (d: any) => y(d.y1) - y(d.y0));
  }

  function zoomin(d: d3.HierarchyRectangularNode<any>) {
    const group0 = group.attr("pointer-events", "none");
    group0.transition().on("end", () => group0.remove()); // Ensure group0 is removed post-transition

    const group1 = (group = svg.append("g")
      .attr("transform", `translate(0, ${breadcrumbHeight})`)
      .call(render, d));

    x.domain([d.x0, d.x1]);
    y.domain([d.y0, d.y1]);

    svg.transition()
      .duration(750)
      .tween("scale", () => {
        const xd = d3.interpolate(x.domain(), [d.x0, d.x1]);
        const yd = d3.interpolate(y.domain(), [d.y0, d.y1]);
        return (t: any) => {
          x.domain(xd(t));
          y.domain(yd(t));
          group0.call(position, d);
          group1.call(position, d);
        };
      });
  }

  function zoomout(target: d3.HierarchyRectangularNode<any>) {
    zoomin(target);
  }

  function updateBreadcrumb(d: d3.HierarchyRectangularNode<any>) {
    const ancestors = d.ancestors().reverse();

    breadcrumbContainer.selectAll("g").remove(); // Clear previous breadcrumb items

    const breadcrumbs = breadcrumbContainer.selectAll("g")
      .data(ancestors)
      .join("g")
      .attr("transform", (d, i) => `translate(${i * 100}, 0)`)
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        component.setSelectedNode(d);
        zoomout(d);
      });

    breadcrumbs.append("rect")
      .attr("width", 100)
      .attr("height", breadcrumbHeight - 5)
      .attr("fill", (d) => color(d.data.name));

    breadcrumbs.append("text")
      .attr("x", 5)
      .attr("y", breadcrumbHeight / 2)
      .attr("dy", "0.35em")
      .text((d) => d.data.name);
  }

  if (rootWithLayout.children && rootWithLayout.children.length > 0) {
    zoomin(rootWithLayout);
  }

  container.innerHTML = ''; // Clear any previous SVG
  if (svg.node()) {
    if (svg.node() !== null) {
      container.appendChild(svg.node() as Node);
    }  } else {
    console.error("SVG creation failed.");
  }
}
