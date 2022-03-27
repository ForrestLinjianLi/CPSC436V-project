class TreeMap {
    /**
     * Class constructor with basic chart configuration
     * @param _config
     * @param _data
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 600,
            containerHeight: 400,
            margin: {top: 30, right: 20, bottom: 20, left: 55},
            tooltipPadding: _config.tooltipPadding || 15
        }
        this.fullData = _data;
        console.log(this.fullData)

        this.data = this.fullData.filter(d => countriesSelected.includes(d.location_code));
        this.data = this.data.filter(d => d.year >= selectedTimeRange[0] && d.year <= selectedTimeRange[1]);
        console.log(this.data);
        this.initVis();
    }

    /**
     * We initialize scales/axes and append static elements, such as axis titles.
     */
    initVis() {
        let vis = this;

        vis.productColorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        let country;
        if(this.data[0] != null && countriesSelected.length == 1){
            country = this.data[0].location_name_short_en;
        }

        //append title
        vis.svg.append('text')
            .attr('id', 'treeMapTitle')
            .attr("x", 300)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr('font-size', '18px')
            .text((export_import == "export") ?
                country + " Export Value Distribution by Product in " + selectedTimeRange[0]
                : country + " Import Value Distribution by Product in " + selectedTimeRange[0]);

        vis.chartArea = vis.svg
            .append("g")
            .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.updateVis();
    }


    updateVis() {
        let vis = this;
        let country;
        if(this.data[0] != null && countriesSelected.length == 1){
            country = this.data[0].location_name_short_en;
        }
        if(countriesSelected.length == 1){
            d3.select("#treeMapTitle").text((export_import == "export") ?
                country + " Export Value Distribution by Product in " + selectedTimeRange[0]
                : country + " Import Value Distribution by Product in " + selectedTimeRange[0]);
        }

        // Specificy accessor functions
        vis.productColorScale.domain(["Textiles", "Agriculture", "Stone", "Minerals", "Metals", "Chemicals", "Vehicles", "Machinery", "Electronics", "Other"]);
        vis.renderVis();
    }

    renderVis() {
        let vis = this;
        // stratify the data: reformatting for d3.js

        let data = vis.data;

        let year, country;
        if(data[0] != null){
            year = data[0].year;
            country = data[0].country;
        }
        console.log(year, country)
        // modify data to treemap structure
        if(data.length > 0){
            for(let i = 0; i < data.length; i++){
                data[i]['parent'] = 'root';
            }
            data.push({ product: "root", parent: "", export_value: 0, import_value: 0, year: year, country: country});
        }
        console.log(data)
        var root = d3.stratify()
            .id(function(d) {
                console.log(d.product)
                return d.product; })   // Name of the entity (column name is name in csv)
            .parentId(function(d) {
                return d.parent; })   // Name of the parent (column name is parent in csv)
            (data);
        root.sum(function(d) {
            let ret = (export_import == "export")? d.export_value : d.import_value;
            return +ret})   // Compute the numeric value for each entity

        // Then d3.treemap computes the position of each element of the hierarchy
        // The coordinates are added to the root object above
        d3.treemap()
            .size([vis.width, vis.height])
            .padding(4)
            (root)

        console.log(root.leaves())

        vis.chartArea
            .selectAll("rect")
            .data(root.leaves())
            .enter()
            .append("rect")
            .attr("class", "treeBlock")
            .attr('x', function (d) {return d.x0;})
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
                    <div class="tooltip-title">${country}</div>
                    <ul>
                      <li>Year: ${year}</li>
                      <li>${d.data.product} ${export_import} value: ${(d.data.export_value/1000000000).toPrecision(4)} Billion USD</li>
                    <ul> 
                    `: `
                    <div class="tooltip-title">${country}</div>
                    <ul>
                      <li>Year: ${year}</li>
                      <li>${d.data.product} ${export_import} value: ${(d.data.import_value/1000000000).toPrecision(4)} Billion USD</li>
                    <ul> 
                    `);
            })
            .on("mouseout", () => {
                d3.select('#tooltip').style('display', 'none');
            })

        // append the text labels for sectors
        vis.chartArea
            .selectAll("text")
            .data(root.leaves())
            .enter()
            .append("text")
            .attr("x", function (d) {return d.x0 + 10})    // +10 to adjust position (more right)
            .attr("y", function (d) {return d.y0 + 20})    // +20 to adjust position (lower)
            .text(function (d) {
                return d.data.product
            })
            .attr("font-size", "12px")
            .attr("fill", "white")
    }

}