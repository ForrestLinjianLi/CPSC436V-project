class Scatterplot {

    /**
     * Class constructor with basic chart configuration
     * @param _config
     * @param _data
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 800,
            containerHeight: 450,
            margin: {top: 60, right: 90, bottom: 20, left: 55},
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

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.xScale = d3.scalePoint()
            .range([30, vis.width-30]);

        vis.yScale = d3.scaleLinear()
            .range([0, vis.height]);

        vis.countryColorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // initialize axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(-vis.height - 10);

        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(-vis.width - 10)
            .tickFormat(function(d){return d/1000000000})
            .tickPadding(5);

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // Append group element that will contain scatter plot
        // and position it according to the given margin config
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Append empty x-axis group and move it to the bottom of the chart
        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`);

        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis');

        vis.colorLegendG = vis.chart.append('g')
            .attr('transform', `translate(${vis.width + 10}, 20)`);

        vis.colorLegendG.append('text')
            .attr('class', 'legend-label')
            .attr('x', -30)
            .attr('y', -40);

        vis.svg.append("text")
            .attr("class", "text-label")
            .attr("id", "valueText")
            .attr('y', 42)
            .attr('x', 0)
            .text("Export Value in Billion");

        vis.svg.append("text")
            .attr("class", "text-label")
            .attr("id", "valueText")
            .attr('y', vis.height + 55)
            .attr('x', vis.width + 45)
            .text("Product");

        vis.svg.append('text')
            .attr('id', 'scatterTitle')
            .attr("x", 380)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr('font-size', '21px')
            .attr('font-weight', 'bold')
            .text("Countries Export Value Comparison by Product in" + selectedTimeRange[0]);

        vis.updateVis();
    }

    /**
     * Prepare the data and scales before render it.
     */
    updateVis() {
        let vis = this;
        d3.select("#valueText").text((export_import == "export") ? "Export Value in Billion":"Import Value in Billion");
        d3.select("#scatterTitle").text((export_import == "export") ?
            "Countries Export Value Comparison by Product in " + selectedTimeRange[0]
            :"Countries Import Value Comparison by Product in " + selectedTimeRange[0]);
        // Specificy accessor functions
        vis.colorValue = d => d.location_code;
        vis.xValue = d => d.product;
        vis.yValue = (export_import == "export") ? d => d.export_value : d => d.import_value;

        // Set the scale input domains
        vis.xScale.domain(["Textiles", "Agriculture", "Stone", "Minerals", "Metals", "Chemicals", "Vehicles", "Machinery", "Electronics", "Other"]);
        let max = (export_import == "export") ? d3.max(vis.data, d => d.export_value) : d3.max(vis.data, d => d.import_value);
        vis.yScale.domain([max, 0]);
        vis.countryColorScale.domain(countriesSelected);
        vis.colorLegend = d3.legendColor()
            .scale(vis.countryColorScale)
            .shape('circle')
            .title("Countries");
        console.log(vis.colorLegend)
        vis.renderVis();
    }

    /**
     * Bind data to visual elements.
     */
    renderVis() {
        let vis = this;

        // Add circles
        const circles = vis.chart.selectAll('.point')
            .data(vis.data, (export_import == "export") ? d => d.export_value:d => d.import_value)
            .join('circle')
            .attr('class', 'point')
            .attr('r', '8px')  // circle 8px
            .attr('cy', d => vis.yScale(vis.yValue(d)))
            .attr('cx', d => vis.xScale(vis.xValue(d)))
            .attr("opacity","0.7") // circle 8px
            .attr('fill', d => vis.countryColorScale(vis.colorValue(d)))
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
                    <div class="tooltip-title">${d.country}</div>
                    <ul>
                      <li>Year: ${d.year}</li>
                      <li>${d.product} ${export_import} value: ${(d.export_value/1000000000).toFixed(2)} Billion USD</li>
                    <ul> 
                  `: `
                    <div class="tooltip-title">${d.country}</div>
                    <ul>
                      <li>Year: ${d.year}</li>
                      <li>${d.product} ${export_import} value: ${(d.import_value/1000000000).toFixed(2)} Billion USD</li>
                    <ul> 
                  `);
            })
            .on("mouseout", () => {
                d3.select('#tooltip').style('display', 'none');
            })

        // Update the axes
        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());

        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove());

        vis.colorLegendG.call(vis.colorLegend)
            .selectAll('.cell text')
            .attr('dy', '0.1em')
            .attr("font-size", "12px");
    }
}