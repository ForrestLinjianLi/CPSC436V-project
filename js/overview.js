class OverviewGraph {
    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, _locations) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 1200,
            containerHeight: 1200,
            margin: {top: 25, right: 20, bottom: 20, left: 35},
            tooltipPadding: _config.tooltipPadding || 15
        }
        this.data = _data;
        this.locations = _locations;
        this.initVis();
    }

    /**
     * We initialize scales/axes and append static elements, such as axis titles.
     */
    initVis() {
        let vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.config.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.config.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Initialize scales
        vis.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        vis.xScale = d3.scaleLinear()
            .domain([1, 40])
            .range([20, 80]);
        vis.yScale = d3.scaleLinear()
            .range([vis.config.height, 0])

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Initialize force simulation
        vis.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-20))
            .force('center', d3.forceCenter(vis.config.width / 2, vis.config.height / 2))
            .force('collide',d3.forceCollide().radius(35).iterations(2));

        vis.updateVis();
    }

    /**
     * Prepare the data and scales before we render it.
     */
    updateVis() {
        let vis = this;
        // Add node-link data to simulation
        vis.simulation.nodes(vis.data.node);
        vis.simulation.force('link').links(vis.data.link).distance(d => 200);
        vis.simulation.force('collide',d3.forceCollide().radius(60).iterations(2));
        vis.renderVis();
    }

    /**
     * Bind data to visual elements.
     */
    renderVis() {
        let vis = this;
        // Add links
        const links = vis.chart.selectAll('line')
            .data(vis.data.link, d => [d.source, d.target])
            .join('line')
            .attr('class', d => `link link-${d.source.id} link-${d.target.id}`)
            .on('mouseover',(event, d) => {
                d3.selectAll(`#node-${d.source.id}, #node-${d.target.id}`).classed('hover', true);
            })
            .on('mouseleave',(event, d) => {
                d3.selectAll(`#node-${d.source.id}, #node-${d.target.id}`).classed('hover', false);
            });

        let patterns = vis.chart.append('defs');

        vis.data.node.forEach(d => {
            patterns.append('pattern')
                .attr('id', d.id+"-icon")
                .attr('width', "100%")
                .attr('height', "100%")
                .attr("x", 0)
                .attr("y", 0)
                .attr("patternUnits", "objectBoundingBox")
                .append("image")
                .attr("href", `image/flags/1x1/${d.id.toLowerCase()}.svg`)
                .attr("height", vis.xScale(d.partner_num))
                .attr("width", vis.xScale(d.partner_num))
                .attr("x", 0)
                .attr("y", 0)
                .attr("preserveAspectRatio", "xMidYMid slice");
            // Add nodes
        })
        const nodes = vis.chart.selectAll('.node').data(vis.data.node, d=> d.id)
            .join('rect')
            .attr('class', `node`)
            .attr('id', d => `node-${d.id}`)
            .attr("fill", d => `url(#${d.id}-icon)`)
            .attr('stroke', 'black')
            .attr('width', d => vis.xScale(d.partner_num))
            .attr('height', d=> vis.xScale(d.partner_num))
            .call(drag(vis.simulation))
            .on('mouseover', (event, d) => {
                d3.selectAll('.link-'+d.id).classed('hover', true);
                d3.select('#tooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .html(`
                      <div class="tooltip-title">${d.id}</div>
                      <ul>
                        <li>Number of primary trading partners: ${d.partner_num}</li>
                      </ul>
                    `);
            })
            .on('mouseleave', (event, d) => {
                d3.selectAll('.link-'+d.id).classed('hover', false);
                d3.select('#tooltip').style('display', 'none');
            });
        // Update positions
        vis.simulation.on('tick', () => {
            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            nodes
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });
    }
}

function drag(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}