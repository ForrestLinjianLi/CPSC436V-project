class OverviewGraph {
    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, _barChart, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 600,
            containerHeight: 500,
            margin: {top: 25, right: 5, bottom: 20, left: 5},
            tooltipPadding: _config.tooltipPadding || 15,
            maxNode: 15,
        }
        this.data = _data;
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

        vis.opacityScale = d3.scaleLinear().range([0.1,1]);
        vis.lengthScale = d3.scaleLinear()
            .range([20, 70]);
        vis.radiusScale = d3.scaleLinear()
            .domain([40, 100])
            .range([50, 30])

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', "100%")
            .attr('height', vis.config.containerHeight);

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.links = vis.chart.append('g');
        vis.nodes = vis.chart.append('g');

        // Initialize force simulation
        vis.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id))
            .force('charge', d3.forceManyBody().strength(50))
            .force('center', d3.forceCenter(vis.config.width / 2, vis.config.height / 2));

        vis.patterns = vis.chart.append('defs');

        vis.numberSlider = d3
            .sliderBottom()
            .domain([0,30])
            .width(500)
            .step(2)
            .default(10)
            // .displayValue(false)
            .on('onchange', (val) => {
                vis.config.maxNode = val;
                vis.updateVis();
                dispatcher.call('updateCountry', event, countriesSelected);
            });

        vis.forceSlider = d3
            .sliderBottom()
            .domain([0.1 , 2])
            .width(500)
            .step((2 - 0.1) / 20)
            .default(1)
            .on('onchange', (val) => {
                zoom.scaleTo(vis.chart, val);
            });

        vis.svg.append('text')
            .attr('id', 'relation-graph-title')
            .attr("x", "50%")
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr('font-size', '21px')
            .attr('font-weight', 'bold')

        d3.select('#number-slider')
            .append('svg')
            .attr('width', "100%")
            .attr('height', 50)
            .append('g')
            .attr('transform', `translate(30, 15)`)
            .call(vis.numberSlider);

        d3.select('#force-slider')
            .append('svg')
            .attr('width', "100%")
            .attr('height', 50)
            .append('g')
            .attr('transform', `translate(30,15)`)
            .call(vis.forceSlider);

        d3.selectAll('.slider text').attr('dy', '0.35em');

        let transform;
        const zoom = d3.zoom()
            .scaleExtent([0.1, 2])
            .on("zoom", e => {
                vis.chart.attr("transform", (transform = e.transform));
                vis.forceSlider.value(e.transform.k);
            });
        vis.svg.call(zoom)
            .call(zoom.transform, d3.zoomIdentity);
        vis.updateVis();
    }

    /**
     * Prepare the data and scales before we render it.
     */
    updateVis() {
        let vis = this;
        let sorted = new Set(vis.data.node.slice().sort((a,b) => d3.descending(a.partner_num, b.partner_num)).map(d => d.id).slice(0, Math.min(vis.data.node.length, vis.config.maxNode+1-countriesSelected.length)));
        countriesSelected.forEach(c => sorted.add(c));
        vis.filteredNode = vis.data.node.filter(d=> sorted.has(d.id));
        vis.filteredLink = vis.data.link.filter(d => (sorted.has(d.target) && sorted.has(d.source) || sorted.has(d.target.id) && sorted.has(d.source.id)));
        vis.opacityScale.domain([d3.min(vis.data.link, d => d.value),d3.max(vis.data.link, d => d.value)])
        vis.lengthScale.domain([1, d3.max(vis.data.node, d=>d.partner_num)]);
        // Add node-link data to simulation
        vis.simulation.nodes(vis.filteredNode);
        vis.simulation.force('link').links(vis.filteredLink);
        vis.simulation.force('center', d3.forceCenter(vis.config.width / 2, vis.config.height / 2))
        vis.simulation.force('collide',d3.forceCollide()
            .radius(vis.radiusScale(vis.data.node.length)))
            .velocityDecay(0.5)
            .alphaTarget(0.1);
        d3.select("#relation-graph-title").text(`The Primary Trading Countries in ${selectedTime}`);
        vis.renderVis();
    }

    /**
     * Bind data to visual elements.
     */
    renderVis() {
        let vis = this;
        vis.svg.append('p').attr('id', '').text(`The Primary Trading Countries in ${selectedTime}`)
        // Add links
        const links = vis.links.selectAll('.link')
            .data(vis.filteredLink, d => [d.source, d.target])
            .join('line')
            .attr('class', d => `link link-${d.source.id} link-${d.target.id}`)
            .attr('stroke-width', 2)
            .attr('opacity', d => vis.opacityScale(d.value))
            .on('mouseover',(event, d) => {
                d3.selectAll(`#node-${d.source.id}, #node-${d.target.id}`).classed('hover', true);
                d3.select('#link-tooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .html(`
                      <div class="tooltip-title">${d.target.id} - ${d.source.id}</div>
                      <ul>
                        <li>Overall Trading Amount: ${d.value}</li>
                      </ul>
                    `);
            })
            .on('mouseleave',(event, d) => {
                d3.selectAll(`#node-${d.source.id}, #node-${d.target.id}`).classed('hover', false);
                d3.select('#link-tooltip').style('display', 'none');
            })
            .on('click',(event, d) => {
                let temp = new Set(countriesSelected);
                if (temp.has(d.target.id) && temp.has(d.source.id)) {
                    temp.delete(d.target.id);
                    temp.delete(d.source.id);
                } else {
                    temp.add(d.target.id);
                    temp.add(d.source.id);
                }
                countriesSelected = Array.from(temp);
                dispatcher.call('updateCountry', event, countriesSelected);
            });

        vis.patterns.selectAll('pattern').data(vis.filteredNode).join('pattern')
            .attr('id', d => d.id+"-icon")
            .attr('width', "100%")
            .attr('height', "100%")
            .attr("x", 0)
            .attr("y", 0)
            .attr("patternUnits", "objectBoundingBox")
            .append("image")
            .attr("href", d=>`image/flags/1x1/${d.id.toLowerCase()}.svg`)
            .attr("height", d=>vis.lengthScale(d.partner_num))
            .attr("width", d=>vis.lengthScale(d.partner_num))
            .attr("x", 0)
            .attr("y", 0)
            .attr("preserveAspectRatio", "xMidYMid slice");

        vis.svg.on("click", function (event) {
            if (event.target.className.baseVal === '') {
                dispatcher.call('updateCountry', event, []);
            }
        });

        const nodes = vis.nodes.selectAll('.node').data(vis.filteredNode, d=> d.id)
            .join('circle')
            .attr('class', `node`)
            .attr('id', d => `node-${d.id}`)
            .attr("fill", d => `url(#${d.id}-icon)`)
            .attr('stroke', 'black')
            .attr('r', d => vis.lengthScale(d.partner_num)/2)
            // .attr('ry', d=> vis.lengthScale(d.partner_num))
            .call(drag(vis.simulation))
            .on('mouseover', (event, d) => {
                d3.selectAll('.link-'+d.id).classed('hover', true);
                d3.select('#node-tooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
                d3.select("#tooltip-content").text(`Number of primary trading partners: ${d.partner_num/2}`)
                d3.select("#tooltip-title").text(`${d.id}`)
                dispatcher.call("updateRelationBarChart", event, d);
            })
            .on('mouseleave', (event, d) => {
                d3.selectAll('.link-'+d.id).classed('hover', false);
                d3.select('#node-tooltip').style('display', 'none');
            })
            .on('click', function (event, d) {
                let temp = new Set(countriesSelected);
                if (temp.has(d.id)) {
                    temp.delete(d.id);
                    countriesSelected = Array.from(temp);
                } else {
                    countriesSelected.push(d.id);
                }
                dispatcher.call('updateCountry', event, countriesSelected);
            }).on("dblclick.zoom", function(d) { d3.event.stopPropagation();
                var dcx = (window.innerWidth/2-d.x*zoom.scale());
                var dcy = (window.innerHeight/2-d.y*zoom.scale());
                vis.zoom.translate([dcx,dcy]);
                vis.nodes.attr("transform", "translate("+ dcx + "," + dcy  + ")scale(" + vis.zoom.scale() + ")");
            });
        // Update positions
        vis.simulation.on('tick', (e) => {
            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            nodes
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        });
        vis.simulation.restart();
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


