let countriesSelectedName;
class TreeMapBarChart {
    /**
     * Class constructor with basic chart configuration
     * @param _config
     * @param _data
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth:  _config.containerWidth || 1000,
            containerHeight: _config.containerHeight || 500,
            margin: {top: 60, right: 150, bottom: 20, left: 30},
            tooltipPadding: _config.tooltipPadding || 15
        }
        this.fullData = _data;
        countriesSelectedName = countriesSelected.map(d => id2name[d]);
        this.data = this.fullData.filter(d => countriesSelectedName.includes(d.country));
        this.data = this.data.filter(d => d.year >= selectedTime && d.year <= selectedTime);
        this.initVis();
    }

    /**
     * We initialize scales/axes and append static elements, such as axis titles.
     */
    initVis() {
        let vis = this;


        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // country
        vis.xScale = d3.scaleBand()
            .range([0, vis.width])
            .paddingInner(0.2);

        // export/import value
        vis.yScale = d3.scaleLinear()
            .range([0, vis.height]);

        // color scale for product type
        vis.productColorScale = d3.scaleOrdinal(d3.schemeTableau10);

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);


        // initialize axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(-vis.height)
            .ticks(countriesSelectedName.length)

        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(-vis.width - 10)
            .tickFormat(function(d){return d/1000000000})
            .tickPadding(5);

        vis.chart = vis.svg
            .append("g")
            .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Append empty x-axis group and move it to the bottom of the chart
        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr("id", "x-axis")
            .attr('transform', `translate(0,${vis.height+5})`)
            .attr("stroke-opacity", 0.2);


        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis')
            .attr("stroke-opacity", 0.2);

        vis.colorLegendG = vis.chart.append('g')
            .attr('transform', `translate(${vis.width + 37}, 20)`)
            .style("font-size", '0.5rem');

        vis.colorLegendG.append('text')
            .attr('class', 'legend-label')
            .attr('x', -30)
            .attr('y', -40);

        //append title
        vis.svg.append('text')
            .attr('id', 'treeMapBarChartTitle')
            .attr("x", "50%")
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr('font-size', 2*vh)
            .attr('font-weight', 'bold')
            .text((export_import == "export") ?
                "Countries Export Value Comparison by Product in " + selectedTime
                :"Countries Import Value Comparison by Product in " + selectedTime)

        vis.svg.append("text")
            .attr("class", "text-label")
            .attr("id", "valueText")
            .attr('y', 44)
            .attr('x', 0)
            .attr('font-size', 0.5*vw)
            .text("Export in Billion $USD");

        vis.updateVis();
    }


    updateVis() {
        let vis = this;
        countriesSelectedName = countriesSelected.map(d => id2name[d]);
        d3.select("#valueText").text((export_import == "export") ? "Export in Billion USD":"Import in Billion USD");
        d3.select("#scatterTitle").text((export_import == "export") ?
            "Countries Export Value Comparison by Product in " + selectedTime
            :"Countries Import Value Comparison by Product in " + selectedTime)

        vis.groupData = d3.group(vis.data, d=>d.country)
        let count = 0
        vis.roots = []
        countriesSelectedName.forEach((v, k) => {
            const value = vis.groupData.get(countriesSelectedName[k]);
            const key = v;
            if (value != null){
                if(value.length > 0){
                    let year = value[0].year;
                    let country = value[0].country;
                    count++;
                    for(let i = 0; i < value.length; i++){
                        value[i]['parent'] = 'root' + key;
                    }
                    value.push({ product: 'root' + key, parent: "", export_value: 0, import_value: 0, year: year, country: country});
                }
                let root = d3.stratify()
                    .id(function(d) {
                        return d.product; })   // Name of the entity (column name is name in csv)
                    .parentId(function(d) {
                        return d.parent; })   // Name of the parent (column name is parent in csv)
                    (value)
                root.sum(function(d) {
                    let ret = (export_import == "export")? d.export_value : d.import_value;
                    return +ret})   // Compute the numeric value for each entity
                vis.roots.push(root);
            }
        })

        // Specificy domains for each scale
        vis.xScale.domain(countriesSelectedName)
        vis.yMax = d3.max(vis.roots, d => d.value) + 20000000000;
        vis.yScale.domain([vis.yMax, 0])
        vis.productColorScale.domain(["Textiles", "Agriculture", "Stone", "Minerals", "Metals", "Chemicals", "Vehicles", "Machinery", "Electronics", "Other"]);
        vis.colorLegend = d3.legendColor()
            .scale(vis.productColorScale)
            .shape('circle');
        vis.renderVis();
    }

    /**
     * Bind data to visual elements.
     */
    renderVis() {
        let vis = this;
        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());

        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove());

        let legendg = vis.colorLegendG.call(vis.colorLegend);
        legendg.selectAll('.cell text')
            .attr('dy', '0.1em')
            .attr("font-size", "12px");

        // Update the axes
        for (let i = 0; i < vis.roots.length; i++){
            let height = (vis.roots[i].value)/vis.yMax * vis.height
            d3.treemap()
                .size([vis.xScale.bandwidth(), height+6])
                .padding(2)
                (vis.roots[i])
            vis.chart
                .selectAll("rect"+i)
                .data(vis.roots[i].leaves())
                .enter()
                .append("rect")
                .attr("class", "rect")
                // TODO: change the x-axis position for each bar
                .attr('transform', `translate(${vis.xScale(vis.roots[i].data.country)}, ${vis.yScale(vis.roots[i].value)-4})`)
                .attr('x', function (d) {return d.x0;})
                .attr('y', function (d) {return d.y0;})
                .attr('width', function (d) {return Math.max(0, d.x1 - d.x0) ;})
                .attr('height', function (d) {return Math.max(0, d.y1 - d.y0) ;})
                .attr('fill', d => vis.productColorScale(d.data.product))
                .on("mouseover", (event, d) => {
                    // tooltip
                    d3.select("#tooltip")
                        .style('display', 'block')
                        .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                        .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                        .style("padding", "5px")
                        .html(
                            (export_import == "export") ?
                                `
                    <div class="tooltip-title">${d.data.product}</div>
                    <ul>
                      <li>${export_import} value: ${(d.data.export_value/1000000000).toFixed(2)} Billion USD</li>
                      <li>Total ${export_import} value: ${(vis.roots[i].value/1000000000).toFixed(2)} Billion USD</li>
                    <ul> 
                    `: `
                    <div class="tooltip-title">${d.data.product}</div>
                    <ul>
                      <li>${export_import} value: ${(d.data.import_value/1000000000).toFixed(2)} Billion USD</li>
                      <li>Total ${export_import} value: ${(vis.roots[i].value/1000000000).toFixed(2)} Billion USD</li>
                    <ul> 
                    `);
                })
                .on("mouseout", () => {
                    d3.select('#tooltip').style('display', 'none');
                })
        }
    }

}