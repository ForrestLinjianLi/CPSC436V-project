class TreeMap {
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
            margin: {top: 40, right: 20, bottom: 20, left: 20},
            tooltipPadding: _config.tooltipPadding || 15
        }
        this.fullData = _data;
        this.data = this.fullData.filter(d => countriesSelected.includes(d.location_code));
        this.data = this.data.filter(d => d.year >= selectedTime && d.year <= selectedTime);
        this.initVis();
    }

    /**
     * We initialize scales/axes and append static elements, such as axis titles.
     */
    initVis() {
        let vis = this;

        vis.productColorScale = d3.scaleOrdinal(d3.schemeTableau10);

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
            .attr("x", "50%")
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr('font-size', 2*vh)
            .attr('font-weight', 'bold')
            .text((export_import == "export") ?
                country + " Export Value Distribution by Product in " + selectedTime
                : country + " Import Value Distribution by Product in " + selectedTime);

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
                country + " Export Value Distribution by Product in " + selectedTime
                : country + " Import Value Distribution by Product in " + selectedTime);
        }

        if (countriesSelected.length == 0) {
            let dy = 60;
            d3.select("#treeMapTitle")
                .attr("y", dy)    
                .text("Please Select A Country to Show The Tree Map");

            let text =  "";
            for (let i = 1; i < timeFilteredData.node.length + 1; i++) {
                text += name2emoji[id2name[timeFilteredData.node[i - 1].id]];
                if (i % 10 == 0) {
                    dy += 60;
                    console.log(dy);
                    vis.svg
                        .append("text")
                        .attr("x", "50%")
                        .attr("y", dy)
                        .attr("text-anchor", "middle")
                        .attr('font-size', 2*vh)
                        .attr('font-weight', 'bold')
                        .text(text)
                    text = "";
                }
            } 
        } else {
            // Specificy accessor functions
            vis.productColorScale.domain(["Textiles", "Agriculture", "Stone", "Minerals", "Metals", "Chemicals", "Vehicles", "Machinery", "Electronics", "Other"]);
            vis.renderVis();
        }
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
        // modify data to treemap structure
        if(data.length > 0){
            for(let i = 0; i < data.length; i++){
                data[i]['parent'] = 'root';
            }
            data.push({ product: "root", parent: "", export_value: 0, import_value: 0, year: year, country: country});
        }
        var root = d3.stratify()
            .id(function(d) {
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
            .style("stroke", "black")
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
                      <li>${d.data.product} ${export_import} value: ${(d.data.export_value/1000000000).toFixed(2)} Billion USD</li>
                    <ul> 
                    `: `
                    <div class="tooltip-title">${country}</div>
                    <ul>
                      <li>Year: ${year}</li>
                      <li>${d.data.product} ${export_import} value: ${(d.data.import_value/1000000000).toFixed(2)} Billion USD</li>
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
            .attr("x", function (d) {return d.x0 + 0.5*vw})    // +10 to adjust position (more right)
            .attr("y", function (d) {return d.y0 + 1.5*vh})    // +20 to adjust position (lower)
            .text(function (d) {
                if(d.x1 - d.x0 > 6*vw && d.y1 - d.y0 > vh) {
                    return d.data.product;
                } else {
                    return null;
                }
            })
            .attr("font-size", 1.5*vh)
            .attr("fill", "white")
    }

}