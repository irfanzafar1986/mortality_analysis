d3.json("body.json").then(data => {
  const svg = d3.select("#viz")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%");

  const g = svg.append("g");

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  // 🎨 one uniform base color for all shapes
  const baseColor = "#A7C7E7";   // light blue (you can change it to any hex code)

  // Draw shapes
  const shapes = g.selectAll(".shape")
    .data(data.shapes)
    .enter()
    .append(d => document.createElementNS("http://www.w3.org/2000/svg", d.type))
    .attr("class", "shape")
    .attr("id", d => d.id)
    .attr("d", d => d.d || null)
    .attr("points", d => d.points || null)
    .style("fill", baseColor)          // same color for all
    .style("stroke", "#555")
    .style("stroke-width", "0.6px");

  // Hover: only outline color changes
  shapes
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget)
        .classed("hover-outline", true);
      tooltip
        .style("opacity", 0.7)
        .html(`<b>${d.id.toUpperCase()}</b>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", (event, d) => {
      d3.select(event.currentTarget)
        .classed("hover-outline", false);
      tooltip.style("opacity", 0);
    });

  // Auto-fit
  const b = g.node().getBBox(), m = 20;
  svg.attr("viewBox", [b.x - m, b.y - m, b.width + 2 * m, b.height + 2 * m].join(" "));
});
