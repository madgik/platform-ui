// import * as d3 from 'd3';

// export function createZoomableCirclePacking(data: any, container: HTMLElement, onNodeClick: (node: any) => void): { zoomToNode: (d: any) => void } {
//   const width = 728;
//   const height = 728;
//   let selectedNode: any = null;

//   const color = d3.scaleLinear<string>()
//     .domain([0, 5])
//     .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
//     .interpolate(d3.interpolateHcl);

//   const pack = (data: any) => d3.pack()
//     .size([width, height])
//     .padding(3)
//     (d3.hierarchy(data)
//       .sum((d: any) => d.value ?? 0)
//       .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)));
//   const root = pack(data);

//   const svg = d3.create("svg")
//     .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
//     .attr("width", width)
//     .attr("height", height)
//     .attr("style", `min-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${color(0)}; cursor: pointer;`);

//   const node = svg.append("g")
//     .selectAll("circle")
//     .data(root.descendants().slice(1))
//     .join("circle")
//     .attr("fill", d => d.children ? color(d.depth) : "white")
//     .on("mouseover", function () { d3.select(this).attr("stroke", "#000"); })
//     .on("mouseout", function () { d3.select(this).attr("stroke", null); })
//     // .on("click", (event, d) => {
//     //   if (focus !== d) {
//     //     selectedNode = event.currentTarget;
//     //     updateSelection();
//     //     zoom(event, d);
//     //     event.stopPropagation();
//     //   }
//     // });
//     .on("click", (event, d) => {
//       if (focus !== d) {
//         zoom(event, d);         // μόνο αυτό φτάνει
//         event.stopPropagation();
//       }
//     });

//   if (svg.node() !== null) {
//     container.appendChild(svg.node() as Node);
//   }

//   // function updateSelection() {
//   //   node.transition().duration(300)
//   //     .attr("fill", d => d === d3.select(selectedNode).datum() ? "hsl(143, 57.60%, 66.70%)" : d.children ? color(d.depth) : "white") // 👈 Highlight selected node
//   //     .attr("stroke", d => d === d3.select(selectedNode).datum() ? "black" : "none") // 👈 Add stroke only to selected
//   //     .attr("stroke-width", d => d === d3.select(selectedNode).datum() ? "2px" : "0"); // 👈 Stroke thickness
//   // }
//   let selectedDataNode: d3.HierarchyNode<any> | null = null;


//   // function updateSelection() {
//   //   node
//   //     .transition().duration(300)
//   //     .attr("fill", d =>
//   //       (selectedDataNode && d === selectedDataNode)
//   //         ? "hsl(143,57.6%,66.7%)"  // highlight leaf
//   //         : d.children
//   //           ? color(d.depth)
//   //           : "white"
//   //     )
//   //     .attr("stroke", d =>
//   //       (selectedDataNode && d === selectedDataNode)
//   //         ? "black"
//   //         : "none"
//   //     )
//   //     .attr("stroke-width", d =>
//   //       (selectedDataNode && d === selectedDataNode)
//   //         ? 2
//   //         : 0
//   //     );

//   //   label
//   //     .style("display", d =>
//   //       (selectedDataNode && d === selectedDataNode)
//   //         ? "inline"
//   //         : "none"
//   //     )
//   //     .style("fill-opacity", d =>
//   //       (selectedDataNode && d === selectedDataNode)
//   //         ? 1
//   //         : 0
//   //     );
//   // }

//   function updateSelection() {
//     const highlightColor = "hsl(143,57.6%,66.7%)";

//     // highlight circles
//     node.transition().duration(200)
//       .attr("fill", d =>
//         d === focus
//           ? highlightColor
//           : d.children
//             ? color(d.depth)
//             : "white"
//       )
//       .attr("stroke", d =>
//         d === focus
//           ? "black"
//           : "none"
//       )
//       .attr("stroke-width", d =>
//         d === focus
//           ? 2
//           : 0
//       );

//     // labels
//     label
//       .style("display", d => {
//         if (focus.children) {
//           // focus είναι group → δείχνουμε μόνο τα παιδιά
//           return d.parent === focus ? "inline" : "none";
//         } else {
//           // focus είναι leaf → δείχνουμε ΜΟΝΟ αυτόν
//           return d === focus ? "inline" : "none";
//         }
//       })
//       .style("fill-opacity", d => {
//         if (focus.children) {
//           return d.parent === focus ? 1 : 0;
//         } else {
//           return d === focus ? 1 : 0;
//         }
//       });
//   }


//   const label = svg.append("g")
//     .style("font", "10px sans-serif")
//     .attr("pointer-events", "none")
//     .attr("text-anchor", "middle")
//     .selectAll<SVGTextElement, any>("text")
//     .data(root.descendants())
//     .join("text")
//     .style("fill-opacity", (d: any) => d.parent === root ? 1 : 0)
//     .style("display", (d: any) => d.parent === root ? "inline" : "none")
//     .text((d: any) => d.data.name);

//   svg.on("click", (event: MouseEvent) => zoom(event, root));
//   let focus = root;
//   let view: [number, number, number];
//   zoomTo([focus.x, focus.y, focus.r * 2]);

//   function zoomTo(v: [number, number, number]) {
//     const k = width / v[2];
//     view = v;

//     label.attr("transform", (d: any) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
//     node.attr("transform", (d: any) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
//     node.attr("r", (d: any) => d.r * k);
//   }

//   function zoom(event: MouseEvent, d: any) {
//     const previousFocus = focus;
//     focus = d;
//     onNodeClick(d.data);

//     svg.transition()
//       .duration(event.altKey ? 7500 : 750)
//       .tween("zoom", () => {
//         const i = d3.interpolateZoom(view, [d.x, d.y, d.r * 2]);
//         return (t: number) => zoomTo(i(t));
//       })
//       .on("end", () => {
//         updateSelection();
//       });

//     label
//       .transition()
//       .duration(500)
//       .style("fill-opacity", d => {
//         if (focus.children) {
//           return d.parent === focus ? 1 : 0;
//         } else {
//           return d === focus ? 1 : 0;
//         }
//       })
//       .on("start", function (this: SVGTextElement, d) {
//         if ((focus.children && d.parent === focus) || (!focus.children && d === focus)) {
//           this.style.display = "inline";
//         }
//       })
//       .on("end", function (this: SVGTextElement, d) {
//         if ((focus.children && d.parent !== focus) || (!focus.children && d !== focus)) {
//           this.style.display = "none";
//         }
//       });

//   }

//   return {
//     zoomToNode: (dataNode: any) => {
//       const target = root.descendants().find(n => n.data.code === dataNode.code);
//       if (!target) return;

//       const group = target.parent ?? root;

//       svg.transition()
//         .duration(750)
//         .tween("zoom", () => {
//           const i = d3.interpolateZoom(view, [group.x, group.y, group.r * 2]);
//           return (t: number) => zoomTo(i(t));
//         })
//         .on("end", () => {
//           focus = group;
//           selectedDataNode = target;
//           updateSelection();
//         });
//     }
//   };

// }

// import * as d3 from 'd3';

// export function createZoomableCirclePacking(
//   data: any,
//   container: HTMLElement,
//   onNodeClick: (node: any) => void
// ): { zoomToNode: (d: any) => void } {
//   const width = 728;
//   const height = 728;

//   const color = d3.scaleLinear<string>()
//     .domain([0, 5])
//     .range(['hsl(152,80%,80%)', 'hsl(228,30%,40%)'])
//     .interpolate(d3.interpolateHcl);

//   const pack = (data: any) =>
//     d3
//       .pack<any>()
//       .size([width, height])
//       .padding(3)(
//         d3
//           .hierarchy<any>(data)
//           .sum((d: any) => d.value ?? 0)
//           .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
//       );

//   const root = pack(data);
//   let focus = root;
//   let view: [number, number, number] = [focus.x, focus.y, focus.r * 2];
//   let selectedDataNode: d3.HierarchyNode<any> | null = null;

//   const svg = d3
//     .create('svg')
//     .attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`)
//     .attr('width', width)
//     .attr('height', height)
//     .attr('style', `min-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${color(0)}; cursor: pointer;`);

//   function isLeafNode(d: d3.HierarchyNode<any>): boolean {
//     return !d.children; // D3 leaf: no children prop at all
//   }
//   const node = svg
//     .append('g')
//     .selectAll('circle')
//     .data(root.descendants().slice(1))
//     .join('circle')
//     .attr('fill', d => (d.children ? color(d.depth) : 'white'))
//     .on('mouseover', function () {
//       d3.select(this).attr('stroke', '#000');
//     })
//     .on('mouseout', function () {
//       d3.select(this).attr('stroke', null);
//     })
//     .on('click', (event, d) => {
//       // if (focus !== d) {
//       //   zoom(event, d);
//       //   event.stopPropagation();
//       // }
//       console.log('Clicked node:', d.data.name, 'Leaf?', isLeafNode(d));
//       event.stopPropagation();

//       if (d.height === 0) {
//         // Leaf node: μόνο highlight
//         selectedDataNode = d;
//         updateSelection();
//         onNodeClick(d.data);
//       } else {
//         // Group node: zoom
//         if (focus !== d) {
//           zoom(event, d);
//         }
//       }
//     });

//   const label = svg
//     .append('g')
//     .style('font', '10px sans-serif')
//     .attr('pointer-events', 'none')
//     .attr('text-anchor', 'middle')
//     .selectAll<SVGTextElement, any>('text')
//     .data(root.descendants())
//     .join('text')
//     .text(d => d.data.name)
//     .style('fill-opacity', d => (d.parent === root ? 1 : 0))
//     .style('display', d => (d.parent === root ? 'inline' : 'none'));

//   svg.on('click', (event: MouseEvent) => zoom(event, root));

//   container.innerHTML = '';
//   container.appendChild(svg.node() as Node);

//   function zoomTo(v: [number, number, number]) {
//     const k = width / v[2];
//     view = v;

//     node.attr('transform', d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
//     node.attr('r', d => d.r * k);

//     label.attr('transform', d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
//   }

//   function updateSelection() {
//     const highlightColor = 'hsla(182, 80%, 56%, 1.00)';

//     node
//       .transition()
//       .duration(200)
//       .attr('fill', d => (d === selectedDataNode ? highlightColor : d.children ? color(d.depth) : 'white'))
//       .attr('stroke', d => (d === selectedDataNode ? 'black' : 'none'))
//       .attr('stroke-width', d => (d === selectedDataNode ? 2 : 0));

//     label
//       .transition()
//       .duration(500)
//       .style('fill-opacity', d => {
//         if (focus.children) {
//           return d.parent === focus ? 1 : 0;
//         } else {
//           return d === focus ? 1 : 0;
//         }
//       })
//       .on('start', function (this: SVGTextElement, d) {
//         if ((focus.children && d.parent === focus) || (!focus.children && d === focus)) {
//           this.style.display = 'inline';
//         }
//       })
//       .on('end', function (this: SVGTextElement, d) {
//         if ((focus.children && d.parent !== focus) || (!focus.children && d !== focus)) {
//           this.style.display = 'none';
//         }
//       });
//   }

//   function zoom(event: MouseEvent, d: any) {
//     if (!d.children) {
//       selectedDataNode = d;
//       updateSelection();
//       onNodeClick(d.data);
//       return;
//     }

//     focus = d;
//     onNodeClick(d.data);

//     svg.transition()
//       .duration(event.altKey ? 7500 : 750)
//       .tween('zoom', () => {
//         const i = d3.interpolateZoom(view, [d.x, d.y, d.r * 2]);
//         return (t: number) => zoomTo(i(t));
//       })
//       .on('end', () => {
//         selectedDataNode = null;
//         updateSelection();
//       });

//     updateSelection();
//   }

//   function zoomToNode(dataNode: any) {
//     const target = root.descendants().find(n => n.data.code === dataNode.code);
//     if (!target) return;

//     const isDirectChildOfRoot = target.parent === root;
//     const group = isDirectChildOfRoot ? root : (target.parent ?? root);
//     const zoomTarget: [number, number, number] =
//       isDirectChildOfRoot
//         ? [group.x + (target.x - group.x) * 0.1, group.y + (target.y - group.y) * 0.5, group.r * 2]
//         : [group.x, group.y, group.r * 2];

//     svg
//       .transition()
//       .duration(750)
//       .tween('zoom', () => {
//         const i = d3.interpolateZoom(view, zoomTarget);
//         return (t: number) => zoomTo(i(t));
//       })
//       .on('end', () => {
//         focus = group;
//         selectedDataNode = target;
//         updateSelection();
//       });
//   }

//   zoomTo([focus.x, focus.y, focus.r * 2]); // initial

//   svg.on('click', function (event: MouseEvent) {
//     if (event.target === this) {
//       zoom(event, root);
//     }
//   });
//   return {
//     zoomToNode
//   };
// }
import * as d3 from 'd3';

export function createZoomableCirclePacking(
  data: any,
  container: HTMLElement,
  onNodeClick: (node: any) => void
): { zoomToNode: (d: any) => void } {
  const width = 700;
  const height = 728;

  const color = d3.scaleLinear<string>()
    .domain([0, 5])
    .range(['hsl(152,80%,80%)', 'hsl(228,30%,40%)'])
    .interpolate(d3.interpolateHcl);

  const pack = (data: any) =>
    d3
      .pack<any>()
      .size([width, height])
      .padding(3)(
        d3
          .hierarchy<any>(data)
          .sum((d: any) => d.value ?? 0)
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      );

  const root = pack(data);
  let focus = root;
  let view: [number, number, number] = [focus.x, focus.y, focus.r * 2];
  let selectedDataNode: d3.HierarchyNode<any> | null = null;

  const svg = d3
    .create('svg')
    .attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`)
    .attr('width', width)
    .attr('height', height)
    .attr('style', `min-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${color(0)}; cursor: pointer;`);

  const node = svg
    .append('g')
    .selectAll('circle')
    .data(root.descendants().slice(1))
    .join('circle')
    .attr('fill', d => (d.children ? color(d.depth) : 'white'))
    .on('mouseover', function () {
      d3.select(this).attr('stroke', '#000');
    })
    .on('mouseout', function () {
      d3.select(this).attr('stroke', null);
    })
    .on('click', (event, d) => {
      // console.log('🔍 Node clicked:', {
      //   name: d.data.name,
      //   hasChildren: !!d.children,
      //   height: d.height,
      //   value: d.value,
      //   childrenLength: d.children?.length ?? 'none'
      // });
      event.stopPropagation();

      if (!d.children) {
        // Leaf node just highlight
        selectedDataNode = d;
        updateSelection();
        onNodeClick(d.data);
        return;
      }

      if (focus !== d) {
        zoom(event, d);
      }
    });

  const label = svg
    .append('g')
    .style('font', '10px sans-serif')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .selectAll<SVGTextElement, any>('text')
    .data(root.descendants())
    .join('text')
    .text(d => d.data.name)
    .style('fill-opacity', d => (d.parent === root ? 1 : 0))
    .style('display', d => (d.parent === root ? 'inline' : 'none'));

  container.innerHTML = '';
  container.appendChild(svg.node() as Node);

  zoomTo([focus.x, focus.y, focus.r * 2]); // αρχική εστίαση

  // Zoom out μόνο όταν click γίνει απευθείας στο SVG
  svg.on('click', function (event: MouseEvent) {
    if (event.target === this) {
      zoom(event, root);
    }
  });

  function zoomTo(v: [number, number, number]) {
    const k = width / v[2];
    view = v;

    node.attr('transform', d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr('r', d => d.r * k);
    label.attr('transform', d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
  }

  function updateSelection() {
    const highlightColor = 'hsla(182, 80%, 56%, 1.00)';

    node
      .transition()
      .duration(200)
      .attr('fill', d => (d === selectedDataNode ? highlightColor : d.children ? color(d.depth) : 'white'))
      .attr('stroke', d => (d === selectedDataNode ? 'black' : 'none'))
      .attr('stroke-width', d => (d === selectedDataNode ? 2 : 0));

    label
      .transition()
      .duration(500)
      .style('fill-opacity', d => {
        if (focus.children) {
          return d.parent === focus ? 1 : 0;
        } else {
          return d === focus ? 1 : 0;
        }
      })
      .on('start', function (this: SVGTextElement, d) {
        if ((focus.children && d.parent === focus) || (!focus.children && d === focus)) {
          this.style.display = 'inline';
        }
      })
      .on('end', function (this: SVGTextElement, d) {
        if ((focus.children && d.parent !== focus) || (!focus.children && d !== focus)) {
          this.style.display = 'none';
        }
      });
  }

  function zoom(event: MouseEvent, d: any) {
    if (!d.children) {
      selectedDataNode = d;
      updateSelection();
      onNodeClick(d.data);
      return;
    }

    focus = d;
    onNodeClick(d.data);

    svg
      .transition()
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
    const target = root.descendants().find(n => n.data.code === dataNode.code);
    if (!target) return;

    const isDirectChildOfRoot = target.parent === root;
    const group = isDirectChildOfRoot ? root : (target.parent ?? root);
    const zoomTarget: [number, number, number] =
      isDirectChildOfRoot
        ? [group.x + (target.x - group.x) * 0.1, group.y + (target.y - group.y) * 0.5, group.r * 2]
        : [group.x, group.y, group.r * 2];

    svg
      .transition()
      .duration(750)
      .tween('zoom', () => {
        const i = d3.interpolateZoom(view, zoomTarget);
        return (t: number) => zoomTo(i(t));
      })
      .on('end', () => {
        focus = group;
        selectedDataNode = target;
        updateSelection();
      });
  }

  return {
    zoomToNode
  };
}
