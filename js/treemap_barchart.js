class TreeMapBarChart {
    /**
     * Class constructor with basic chart configuration
     * @param _config
     * @param _data
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 700,
            containerHeight: 450,
            margin: {top: 40, right: 20, bottom: 20, left: 20},
            tooltipPadding: _config.tooltipPadding || 15
        }
        this.fullData = _data;
        console.log(this.fullData)

        this.data = this.fullData.filter(d => countriesSelectedName.includes(d.country));
        this.data = this.data.filter(d => d.year >= selectedTime && d.year <= selectedTime);
        console.log(this.data);
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
        vis.productColorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);


        // initialize axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(-vis.height)
            .tickSizeOuter(0)

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
            .attr('transform', `translate(0,${vis.height+10})`)
            .attr("stroke-opacity", 0.2);


        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis')
            .attr("stroke-opacity", 0.2);

        //append title
        vis.svg.append('text')
            .attr('id', 'treeMapBarChartTitle')
            .attr("x", 350)
            .attr("y", 10)
            .attr("text-anchor", "middle")
            .attr('font-size', '21px')
            .attr('font-weight', 'bold')
            .text((export_import == "export") ?
                "Countries Export Value Comparison by Product in " + selectedTime
                :"Countries Import Value Comparison by Product in " + selectedTime)

        vis.svg.append("text")
            .attr("class", "text-label")
            .attr("id", "valueText")
            .attr('y', 25)
            .attr('x', 0)
            .text("Export Value in Billion");

        vis.updateVis();
    }


    updateVis() {
        let vis = this;
        d3.select("#valueText").text((export_import == "export") ? "Export Value in Billion":"Import Value in Billion");
        d3.select("#scatterTitle").text((export_import == "export") ?
            "Countries Export Value Comparison by Product in " + selectedTime
            :"Countries Import Value Comparison by Product in " + selectedTime)

        // TODO: for now only set 5 country at max
        // modify data to treemap barchart structure
        vis.groupData = d3.group(vis.data, d=>d.country)
        // let data = []
        let count = 0
        vis.roots = []
        console.log(vis.groupData);
        //console.log(vis.groupData.get(countriesSelectedName[0]));
        countriesSelectedName.forEach((v, k) => {
        // vis.groupData.forEach((value, key)=>{
            const value = vis.groupData.get(countriesSelectedName[k]);
            const key = v;
            console.log(value, key);
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
        })

        console.log(vis.roots)

        // Specificy domains for each scale
        vis.xScale.domain(countriesSelectedName)
        // vis.x1Scale.rangeRound([0, vis.x0Scale.bandwidth()])
        vis.yMax = d3.max(vis.roots, d => d.value) + 10000000000;
        console.log("max val: "+vis.yMax)
        vis.yScale.domain([vis.yMax, 0])
        vis.productColorScale.domain(["Textiles", "Agriculture", "Stone", "Minerals", "Metals", "Chemicals", "Vehicles", "Machinery", "Electronics"]);
        vis.renderVis();
    }

    /**
     * Bind data to visual elements.
     */
    renderVis() {
        let vis = this;
        console.log(vis.roots);
        // Repeat the first item in roots to serve as a dummy
        // vis.roots.splice(0, 0, vis.roots[0]);
        // console.log(vis.roots);
        // Update the axes
        for (let i = 0; i < vis.roots.length; i++){
            console.log(vis.roots[i]);
            console.log("root val: "+vis.roots[i].value)
            console.log("yScale root val: "+vis.yScale(vis.roots[i].value))
            let height = (vis.roots[i].value)/vis.yMax * vis.height
            console.log("height: " + height)
            d3.treemap()
                .size([vis.xScale.bandwidth(), height])
                .padding(4)
                (vis.roots[i])
            vis.chart
                .selectAll("rect"+i)
                .data(vis.roots[i].leaves())
                .enter()
                .append("rect")
                .attr("class", "rect")
                // TODO: change the x-axis position for each bar
                .attr('transform', `translate(${10+i*vis.xScale.bandwidth() + i * vis.width/(4*vis.roots.length)}, ${vis.height+4-height})`)
                .attr('x', function (d) {
                    console.log(d);
                    return d.x0;})
                .attr('y', function (d) {return d.y0;})
                .attr('width', function (d) {return d.x1 - d.x0;})
                .attr('height', function (d) {return d.y1 - d.y0;})
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
                    <div class="tooltip-title">${d.data.country}</div>
                    <ul>
                      <li>Year: ${d.data.year}</li>
                      <li>${d.data.product} ${export_import} value: ${(d.data.export_value/1000000000).toFixed(2)} Billion USD</li>
                      <li>Total ${export_import} value: ${(vis.roots[i].value/1000000000).toFixed(2)} Billion USD</li>
                    <ul> 
                    `: `
                    <div class="tooltip-title">${d.data.country}</div>
                    <ul>
                      <li>Year: ${d.data.year}</li>
                      <li>${d.data.product} ${export_import} value: ${(d.data.import_value/1000000000).toFixed(2)} Billion USD</li>
                      <li>Total ${export_import} value: ${(vis.roots[i].value/1000000000).toFixed(2)} Billion USD</li>
                    <ul> 
                    `);
                })
                .on("mouseout", () => {
                    d3.select('#tooltip').style('display', 'none');
                })
        }



        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());

        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove());
    }

}