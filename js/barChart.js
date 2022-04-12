class Barchart {

    /**
     * Class constructor with basic chart configuration
     * @param _config {Object}
     * @param _data {Array}
     */
    constructor(_config, _data) {
        // Configuration object with defaults
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 350,
            containerHeight: _config.containerHeight || 230,
            margin: _config.margin || {top: 0, right: 10, bottom: 35, left: 90},
        }
        this.data = _data;
        this.initVis();
    }

    /**
     * Initialize scales/axes and append static elements, such as axis titles
     */
    initVis() {
        let vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Initialize scales and axes
        vis.productColorScale = d3.scaleOrdinal(d3.schemeTableau10);

        vis.xScale = d3.scaleLinear()
            .range([0, vis.width]);

        vis.yScale = d3.scaleBand()
            .range([0, vis.height])
            .paddingInner(0.2);

        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(5)
            .tickSize(-vis.height)
            .tickSizeOuter(0);

        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(0);

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // SVG Group containing the actual chart; D3 margin convention
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Append empty x-axis group and move it to the bottom of the chart
        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`);

        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis');

        vis.chart.append('text')
            .attr('class', 'axis_title')
            .attr('y', vis.height + 30)
            .attr('x', vis.width)
            .style('text-anchor', 'end')
            .text("billion USD")
    }

    /**
     * Prepare data and scales before we render it
     */
    updateVis() {
        let vis = this;

        // Specify accessor functions
        vis.yValue = d => data["category"][d[0]];
        vis.xValue = d => d[1]/1000000000;

        // Set the scale input domajs
        vis.yScale.domain(vis.data.map(vis.yValue));
        vis.xScale.domain([0, d3.max(vis.data, vis.xValue)]);
        vis.renderVis();
    }

    /**
     * Bind data to visual elements
     */
    renderVis() {
        let vis = this;

        // Add rectangles
        let bars = vis.chart.selectAll('.bar')
            .data(vis.data, vis.xValue)
            .join('rect');

        bars.style('opacity', 1)
            .attr('stroke', 'black')
            .attr('fill', d => vis.productColorScale(data["category"][d[0]]))
            .classed('bar', true)
            .attr('y', d => vis.yScale(vis.yValue(d)))
            .attr('height', vis.yScale.bandwidth())
            .attr('width', d => Math.max(vis.xScale(vis.xValue(d)), 0))
            .attr('x', 1);

        // Update axes
        vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);
    }
}