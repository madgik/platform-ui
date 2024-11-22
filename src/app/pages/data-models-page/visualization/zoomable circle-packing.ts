import * as d3 from 'd3';

export function createZoomableCirclePacking(data: any, container: HTMLElement, onNodeClick: (node: any) => void): void {
  const width = 928;
  const height = 928;

  const color = d3.scaleLinear<string>()
    .domain([0, 5])
    .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
    .interpolate(d3.interpolateHcl);

  const pack = (data: any) => d3.pack()
    .size([width, height])
    .padding(3)
    (d3.hierarchy(data)
      .sum((d: any) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)));
  const root = pack(data);

  const svg = d3.create("svg")
    .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
    .attr("width", width)
    .attr("height", height)
    .attr("style", `max-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${color(0)}; cursor: pointer;`);

  const node = svg.append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1))
    .join("circle")
    .attr("fill", d => d.children ? color(d.depth) : "white")
    .on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
    .on("mouseout", function() { d3.select(this).attr("stroke", null); })
    .on("click", (event, d) => {
      if (focus !== d) {
        zoom(event, d);
        event.stopPropagation();
      }
    });

  const label = svg.append("g")
    .style("font", "10px sans-serif")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll<SVGTextElement, any>("text")
    .data(root.descendants())
    .join("text")
    .style("fill-opacity", (d: any) => d.parent === root ? 1 : 0)
    .style("display", (d: any) => d.parent === root ? "inline" : "none")
    .text((d: any) => d.data.name);

  svg.on("click", (event: MouseEvent) => zoom(event, root));
  let focus = root;
  let view: [number, number, number];
  zoomTo([focus.x, focus.y, focus.r * 2]);

  function zoomTo(v: [number, number, number]) {
    const k = width / v[2];
    view = v;

    label.attr("transform", (d: any) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", (d: any) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", (d: any) => d.r * k);
  }

  function zoom(event: MouseEvent, d: any) {
    focus = d;
    onNodeClick(d.data);

    if (!d.children) {
      return;
    }


    svg.transition()
      .duration(event.altKey ? 7500 : 750)
      .tween("zoom", () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return (t: number) => zoomTo(i(t));
      });

    label
      .filter(function (this: SVGTextElement, d: any) {
        return d.parent === focus || (this as SVGTextElement).style.display === "inline";
      })
      .transition()
      .style("fill-opacity", (d: any) => (d.parent === focus ? 1 : 0))
      .on("start", function (this: SVGTextElement, d: any) {
        if (d.parent === focus) this.style.display = "inline";
      })
      .on("end", function (this: SVGTextElement, d: any) {
        if (d.parent !== focus) this.style.display = "none";
      });


  }

  if (svg.node() !== null) {
    container.appendChild(svg.node() as Node);
  }
}
