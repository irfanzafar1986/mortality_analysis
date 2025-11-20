// =======================================
// GLOBAL FILTER STATE
// =======================================
let globalFilters = {
    sex: null,
    state: null,
    year: null,
    age: null
};

let selectedOrgan = null;   // for charts

// =======================================
// LOAD SHAPES + DATA
// =======================================
Promise.all([
    d3.json("body.json"),
    d3.csv("data.csv", d3.autoType)
]).then(([shapeData, rawData]) => {

    const data = rawData;

    // =======================================
    // CONTAINER & SVG
    // =======================================
    const container = d3.select("#viz")
        .style("position", "relative");

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%");

    const g = svg.append("g");

    // =======================================
    // TOOLTIP
    // =======================================
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("padding", "6px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("font-family", "Arial")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // =======================================
    // COLOR SCALE (FIXED RANGE 1% → 10%)
    // =======================================
    const colorScale = d3.scaleLinear()
        .domain([0.01, 0.055, 0.10])
        .range(["#2ECC71", "#F1C40F", "#E74C3C"]) // green → yellow → red
        .interpolate(d3.interpolateRgb);

    let organValues = new Map();

    // =======================================
    // DRAW BODY SHAPES
    // =======================================
    const shapes = g.selectAll(".shape")
        .data(shapeData.shapes)
        .enter()
        .append(d => document.createElementNS("http://www.w3.org/2000/svg", d.type))
        .attr("class", "shape")
        .attr("id", d => d.id)
        .attr("d", d => d.d || null)
        .style("stroke", "#333")
        .style("stroke-width", "0.7px")
        .style("cursor", "pointer");

    shapes.raise();

    // =======================================
    // LEGEND (VERTICAL)
// =======================================
    const legend = container.append("div")
        .style("position", "absolute")
        .style("bottom", "20px")
        .style("left", "20px")
        .style("background", "white")
        .style("padding", "12px 15px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "6px")
        .style("font-family", "Arial")
        .style("font-size", "14px")
        .style("color", "#333")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("gap", "10px")
        .style("box-shadow", "0 2px 6px rgba(0,0,0,0.2)");

    legend.html(`
        <b>Mortality Risk</b>
        <div id="legend-range" style="font-size:12px;color:#666;">
            Range: 1% → 10%
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;">
                <div style="width:20px;height:20px;background:#2ECC71;border:1px solid #888;margin-right:8px;"></div>
                <span>Low</span>
            </div>

            <div style="display:flex;align-items:center;">
                <div style="width:20px;height:20px;background:#F1C40F;border:1px solid #888;margin-right:8px;"></div>
                <span>Medium</span>
            </div>

            <div style="display:flex;align-items:center;">
                <div style="width:20px;height:20px;background:#E74C3C;border:1px solid #888;margin-right:8px;"></div>
                <span>High</span>
            </div>
        </div>
    `);

    // =======================================
    // FILTERING LOGIC
    // =======================================
    function getFilteredBase(organ) {
        return data.filter(d =>
            (!organ || d.Organ.toLowerCase() === organ) &&
            (!globalFilters.sex   || d.sex_name      === globalFilters.sex) &&
            (!globalFilters.state || d.location_name === globalFilters.state) &&
            (!globalFilters.year  || d.year          === globalFilters.year) &&
            (!globalFilters.age   || d.age_name      === globalFilters.age)
        );
    }

    // =======================================
    // UPDATE BODY COLORS
    // =======================================
    function updateOrganColors() {

        let filtered = data.filter(d =>
            (!globalFilters.sex   || d.sex_name      === globalFilters.sex) &&
            (!globalFilters.state || d.location_name === globalFilters.state) &&
            (!globalFilters.year  || d.year          === globalFilters.year) &&
            (!globalFilters.age   || d.age_name      === globalFilters.age)
        );

        const organAgg = d3.rollup(
            filtered,
            v => d3.mean(v, d => d.val),
            d => d.Organ.toLowerCase()
        );

        organValues = organAgg;

        shapes.transition().duration(400)
            .style("fill", d => {
                const key = d.id.toLowerCase();
                const val = organAgg.get(key);
                return val != null ? colorScale(val) : "#ccc";
            });
    }

    updateOrganColors();

    // =======================================
    // HOVER EFFECTS
    // =======================================
    shapes.on("mouseover", (event, d) => {
        const key = d.id.toLowerCase();
        const val = organValues.get(key);

        tooltip.style("opacity", 1)
            .html(`
                <b>${d.id.toUpperCase()}</b><br>
                POD: <b>${val ? (val * 100).toFixed(2) + "%" : "No data"}</b>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");

        d3.select("#organLabel").remove();

        container.append("div")
            .attr("id", "organLabel")
            .style("position", "absolute")
            .style("left", (event.offsetX + 15) + "px")
            .style("top", (event.offsetY - 40) + "px")
            .style("background", "rgba(255,255,255,0.9)")
            .style("padding", "3px 8px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "3px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .text(`${d.id.toUpperCase()} — ${val ? (val*100).toFixed(2)+"%" : "NA"}`);
    });

    shapes.on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 28) + "px");

        d3.select("#organLabel")
            .style("left", (event.offsetX + 15) + "px")
            .style("top", (event.offsetY - 40) + "px");
    });

    shapes.on("mouseout", () => {
        tooltip.style("opacity", 0);
        d3.select("#organLabel").remove();
    });

    // =======================================
    // CLICK ORGAN
    // =======================================
    shapes.on("click", (event, d) => {
        event.stopPropagation();
        selectedOrgan = d.id.toLowerCase();

        shapes.style("opacity", s => s.id.toLowerCase() === selectedOrgan ? 1 : 0.15);

        renderCharts(selectedOrgan);
    });

    // =======================================
    // CLICK OUTSIDE → RESET
    // =======================================
    svg.on("click", () => {
        shapes.style("opacity", 1);
        selectedOrgan = null;
        renderCharts(null);
    });

    // =======================================
    // FIT SVG TO BODY OUTLINE
    // =======================================
    // =======================================
// SCALE & CENTER BODY TO FILL CONTAINER
// =======================================
function resizeBody() {
    const node = container.node();
    const width  = node.clientWidth;
    const height = node.clientHeight;
    if (!width || !height) return;

    const bbox = g.node().getBBox();
    const padding = 20;

    const scale = Math.min(
        (width  - 2 * padding) / bbox.width,
        (height - 2 * padding) / bbox.height
    );

    const tx = (width  - bbox.width  * scale) / 2 - bbox.x * scale;
    const ty = (height - bbox.height * scale) / 2 - bbox.y * scale;

    g.attr("transform", `translate(${tx},${ty}) scale(${scale})`);
}

resizeBody();
window.addEventListener("resize", resizeBody);



    // =======================================
    // CHART CONTAINERS
    // =======================================
    const chart1Container = d3.select("#chart1");
    const chart2Container = d3.select("#chart2");

    // =======================================
    // RENDER CHARTS
    // =======================================
    function renderCharts(organ) {

        chart1Container.selectAll("*").remove();
        chart2Container.selectAll("*").remove();

        const organLabel = organ ? organ.toUpperCase() : "ALL ORGANS";

        const base = getFilteredBase(organ);  

        if (!base.length) {
            chart1Container.append("div")
                .text("No data available for this organ and filters.")
                .style("font-family", "Arial")
                .style("color", "#a00");

            chart2Container.append("div")
                .text("No data available for this organ and filters.")
                .style("font-family", "Arial")
                .style("color", "#a00");
            return;
        }

        const years = Array.from(new Set(base.map(d => d.year))).sort((a,b) => a-b);


        // =======================================
        // CHART 1 — LINE CHART (MALE VS FEMALE)
        // =======================================
        const sexes = ["Male", "Female"];

        const series = sexes.map(sex => ({
            name: sex,
            values: years.map(year => {
                const subset = base.filter(d => d.year === year && d.sex_name === sex);
                const meanVal = subset.length ? d3.mean(subset, d => d.val) : null;
                return { year, value: meanVal };
            })
        }));

        const c1Width  = chart1Container.node().clientWidth  || 380;
        const c1Height = chart1Container.node().clientHeight || 220;

        const margin1 = { top: 30, right: 20, bottom: 40, left: 50 };

        const svg1 = chart1Container.append("svg")
            .attr("width", c1Width)
            .attr("height", c1Height);

        const xLine = d3.scaleLinear()
            .domain(d3.extent(years))
            .range([margin1.left, c1Width - margin1.right]);

        const yLine = d3.scaleLinear()
            .domain([0.01, 0.10])
            .range([c1Height - margin1.bottom, margin1.top]);

        svg1.append("g")
            .attr("transform", `translate(0,${c1Height - margin1.bottom})`)
            .call(d3.axisBottom(xLine).tickFormat(d3.format("d")));

        svg1.append("g")
            .attr("transform", `translate(${margin1.left},0)`)
            .call(d3.axisLeft(yLine).tickFormat(d => (d*100).toFixed(0) + "%"));

        const colorSex = d3.scaleOrdinal()
            .domain(sexes)
            .range(["#3498DB", "#E91E63"]);
        // Legend for line chart (Male vs Female)
const legend1 = svg1.append("g")
    .attr("transform", `translate(${c1Width - margin1.right - 90}, ${margin1.top})`);

sexes.forEach((sex, i) => {
    const gLeg = legend1.append("g")
        .attr("transform", `translate(0, ${i * 18})`);

    gLeg.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colorSex(sex));

    gLeg.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .style("font-family", "Arial")
        .style("font-size", "11px")
        .text(sex);
});


        const lineGen = d3.line()
            .defined(d => d.value != null)
            .x(d => xLine(d.year))
            .y(d => yLine(d.value));

        series.forEach(s => {
            svg1.append("path")
                .datum(s.values.filter(lineGen.defined()))
                .attr("fill", "none")
                .attr("stroke", colorSex(s.name))
                .attr("stroke-width", 2)
                .attr("d", lineGen);

            svg1.selectAll(`.dot-${s.name}`)
                .data(s.values.filter(d => d.value != null))
                .enter()
                .append("circle")
                .attr("cx", d => xLine(d.year))
                .attr("cy", d => yLine(d.value))
                .attr("r", 3)
                .attr("fill", colorSex(s.name))
                .on("mouseover", (event, d) => {
                    tooltip.style("opacity", 1)
                        .html(`
                            <b>${organLabel}</b><br>
                            Sex: <b>${s.name}</b><br>
                            Year: <b>${d.year}</b><br>
                            POD: <b>${(d.value*100).toFixed(2)}%</b>
                        `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => tooltip.style("opacity", 0));
        });

       svg1.append("text")
    .attr("x", c1Width / 2)
    .attr("y", margin1.top - 10)
    .attr("text-anchor", "middle")
    .style("font-family", "Arial")
    .style("font-size", "13px")
    .style("font-weight", "bold")
    .text(`${organLabel} — Male vs Female (Yearly)`);


        // =======================================
        // CHART 2 — CLEAN STACKED BAR CHART
        // =======================================
        const ageGroups = ["0-14 years", "15-49 years", "50-74 years", "75+ years"];

        const stacked = years.map(year => {
            const row = { year };
            ageGroups.forEach(age => {
                const subset = base.filter(d => d.year === year && d.age_name === age);
                row[age] = subset.length ? d3.mean(subset, d => d.val) * 100 : 0;
            });
            return row;
        });

        const c2Width  = chart2Container.node().clientWidth  || 400;
        const c2Height = chart2Container.node().clientHeight || 260;
        const margin2 = { top: 30, right: 20, bottom: 60, left: 50 };

        const svg2 = chart2Container.append("svg")
            .attr("width", c2Width)
            .attr("height", c2Height);

        const xStack = d3.scaleBand()
            .domain(years)
            .range([margin2.left, c2Width - margin2.right])
            .padding(0.25);

        const yStack = d3.scaleLinear()
            .domain([0, d3.max(stacked, d =>
                ageGroups.reduce((sum, age) => sum + d[age], 0)
            )])
            .nice()
            .range([c2Height - margin2.bottom, margin2.top]);

        const colorAge = d3.scaleOrdinal()
    .domain(ageGroups)
    .range(["#0D47A1", "#1976D2", "#42A5F5", "#90CAF9"]);


        const stack = d3.stack().keys(ageGroups);
        const seriesStack = stack(stacked);

        svg2.append("g")
            .selectAll("g")
            .data(seriesStack)
            .enter().append("g")
            .attr("fill", d => colorAge(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => xStack(d.data.year))
            .attr("y", d => yStack(d[1]))
            .attr("height", d => yStack(d[0]) - yStack(d[1]))
            .attr("width", xStack.bandwidth())
            .style("transition", "all 0.3s ease")
            .on("mouseover", (event, d) => {
                const age = event.currentTarget.parentNode.__data__.key;
                const val = d.data[age];
                tooltip.style("opacity", 1)
                    .html(`
                        <b>${organLabel}</b><br>
                        Year: <b>${d.data.year}</b><br>
                        Age: <b>${age}</b><br>
                        POD: <b>${val.toFixed(2)}%</b>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => tooltip.style("opacity", 0));

        svg2.append("g")
            .attr("transform", `translate(0,${c2Height - margin2.bottom})`)
            .call(d3.axisBottom(xStack).tickFormat(d3.format("d")));

        svg2.append("g")
            .attr("transform", `translate(${margin2.left},0)`)
            .call(d3.axisLeft(yStack).tickFormat(d => d + "%"));

        svg2.append("text")
    .attr("x", c2Width / 2)
    .attr("y", margin2.top - 10)
    .attr("text-anchor", "middle")
    .style("font-family", "Arial")
    .style("font-size", "13px")
    .style("font-weight", "bold")
    .text(`${organLabel} — Age Groups Stacked (Yearly)`);


        const legend2 = svg2.append("g")
            .attr("transform", `translate(${c2Width - margin2.right - 110},${margin2.top})`);

        ageGroups.forEach((age, i) => {
            const gLeg = legend2.append("g")
                .attr("transform", `translate(0,${i*18})`);

            gLeg.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", colorAge(age));

            gLeg.append("text")
                .attr("x", 18)
                .attr("y", 10)
                .style("font-family", "Arial")
                .style("font-size", "11px")
                .text(age);
        });
    }

    renderCharts(null);

    // =======================================
    // FILTER CHANGE HANDLER
    // =======================================
    window.addEventListener("filterChanged", e => {
        Object.assign(globalFilters, e.detail);
        updateOrganColors();
        renderCharts(selectedOrgan);
    });

});
