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
            containerHeight: 600,
            margin: {top: 25, right: 20, bottom: 20, left: 35},
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
            .tickFormat(d3.format(".2s"))
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

        vis.svg.append("text")
            .attr("class", "text-label")
            .attr('y', 10)
            .attr('x', 0)
            .text("Value");

        vis.updateVis();
    }

    /**
     * Prepare the data and scales before render it.
     */
    updateVis() {
        let vis = this;

        // Specificy accessor functions
        vis.colorValue = d => d.location_code;
        vis.xValue = d => d.product;
        vis.yValue = d => d.export_value;

        // Set the scale input domains
        vis.xScale.domain(["Textiles", "Agriculture", "Stone", "Minerals", "Metals", "Chemicals", "Vehicles", "Machinery", "Electronics", "Other"]);
        console.log(d3.max(vis.data, d => d.export_value))
        vis.yScale.domain([d3.max(vis.data, d => d.export_value), 0]);
        vis.countryColorScale.domain(countriesSelected)
        vis.renderVis();
    }

    /**
     * Bind data to visual elements.
     */
    renderVis() {
        let vis = this;

        // Add circles
        const circles = vis.chart.selectAll('.point')
            .data(vis.data, d => d.export_value)
            .join('circle')
            .attr('class', 'point')
            .attr('r', '8px')  // circle 8px
            .attr('cy', d => vis.yScale(vis.yValue(d)))
            .attr('cx', d => vis.xScale(vis.xValue(d)))
            .attr("opacity","0.4") // circle 8px
            .attr('fill', d => vis.countryColorScale(vis.colorValue(d)))
            .on("mouseover", (event, d) => {
                // tooltip
                d3.select("#tooltip")
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .style("padding", "5px")
                    .html(`
                    <div class="tooltip-title">${d.country}</div>
                    <ul>
                      <li>Year: ${d.year}</li>
                      <li>${d.product} ${export_import} value: ${d.export_value}</li>
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
            .call(g => g.select('.domain').remove())
    }
}