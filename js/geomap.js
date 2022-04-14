class ChoroplethMap {

    /**
     * Class constructor with basic configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _world_data, _value_data, _export_import, _selected_country_id, _dispatcher) {
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 800,
        containerHeight: _config.containerHeight || 500,
        margin: _config.margin || {top: 0, right: 20, bottom: 0, left: 0},
        tooltipPadding: 10,
        legendBottom: 35,
        legendLeft: 10,
        legendRectHeight: 12, 
        legendRectWidth: 200
      }
      this.data = _world_data;
      this.value_data = _value_data;
      this.export_import = _export_import;
      this.selected_country_id = _selected_country_id;
      this.dispatcher = _dispatcher;
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
  
      // Define size of SVG drawing area
      vis.svg = d3.select(vis.config.parentElement).append('svg')
          .attr('width', vis.config.containerWidth)
          .attr('height', vis.config.containerHeight);


      // Append group element that will contain our actual chart 
      // and position it according to the given margin config
      vis.chart = vis.svg.append('g')
          .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
  
      // Initialize projection and path generator
      vis.projection = d3.geoMercator();
      vis.geoPath = d3.geoPath().projection(vis.projection);
  
  
      // Initialize gradient that we will later use for the legend
      vis.linearGradient = vis.svg.append('defs').append('linearGradient')
          .attr("id", "legend-gradient");
  
      // Append legend
      vis.legend = vis.svg.append('g')
          .attr('class', 'legend')
          //.attr('transform', `translate(${vis.width - vis.config.legendLeft- 100},${ vis.config.legendBottom})`);
          .attr('transform', `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom})`);
      
      vis.legendRect = vis.legend.append('rect')
          .attr('width', vis.config.legendRectWidth)
          .attr('height', vis.config.legendRectHeight);

      vis.legend.append('text')
          .attr('id', 'geomap-legend-title')
          .attr('dy', '.35em')
          .attr('y', -10);

      vis.strokeWidth = 2.2;

    vis.svg.append('text')
        .attr('id', 'geomap-title')
        .attr("x", "50%")
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr('font-size', 2*vh)
        .attr('font-weight', 'bold')

      vis.updateVis();
    }
  
    updateVis() {
      let vis = this;
        let indexs = vis.value_data['node'].map(d => d.id);
        if (vis.export_import == 'export') {
            vis.c1 = '#cfe2f2';
            vis.c2 = '#2e73ad';
            vis.data.features.forEach(d => {
                d.properties.value = indexs.includes(d.id)? d3.sum(Object.entries(vis.value_data['node'][indexs.indexOf(d.id)]['export']), j => j[1]):0});
        } else {
            vis.c1 = '#f2cfea';
            vis.c2 = '#b31483';
            vis.data.features.forEach(d => d.properties.value = indexs.includes(d.id)? d3.sum(Object.entries(vis.value_data['node'][indexs.indexOf(d.id)]['import']), j => j[1]) :0);
        }
      
      vis.colorScale = d3.scaleLinear()
        .range([vis.c1, vis.c2])
        .interpolate(d3.interpolateHcl);

        d3.select("#geomap-title").text(`The Total ${vis.export_import == "export"? "Export":"Import"} Value of Countries in ${selectedTime}`);

        const extent = d3.extent(vis.data.features, d => d.properties.value);

      // Update color scale
      vis.colorScale.domain(d3.extent(vis.data.features, d => d.properties.value));
      
      // Define begin and end of the color gradient (legend)
      vis.legendStops = [
        { color: vis.c1, value: extent[0], offset: 0},
        { color: vis.c2, value: extent[1], offset: 100},
      ];

      vis.renderVis();
    }


    renderVis() {
      let vis = this;

      // Convert compressed TopoJSON to GeoJSON format
      //const countries = topojson.feature(vis.data, vis.data.objects.collection)
      const countries = vis.data;

      // Defines the scale of the projection so that the geometry fits within the SVG area
      vis.projection.fitSize([vis.width, vis.height], countries);

      // Append world map
      const countryPath = vis.chart.selectAll('.country')
          .data(countries.features)
        .join('path')
          .attr('class', 'country')
          .attr('d', vis.geoPath)
          .attr('stroke', d => vis.selected_country_id.includes(d.id) ? "#333": "none")
          .attr('stroke-width', `${vis.strokeWidth}px`)
          .attr('fill', d => {
            if (d.properties.value) {
              return vis.colorScale(d.properties.value);
            } else {
              return "rgb(220,220,220)";
              //return 'url(#lightstripe)';
            }
          });


      countryPath
          .on('mousemove', (event,d) => {
            const value = d.properties.value ? `${vis.export_import} value: <strong>$${Math.round(d.properties.value/(10**9))}</strong> billion` : 'No data available'; 
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .html(`
                <div class="tooltip-title">${d.properties.name}</div>
                <div>${value}</div>
              `);
          })
          .on('mouseleave', () => {
            d3.select('#tooltip').style('display', 'none');
          });

      // Bidirectional linked global country filters
      countryPath
          .on('click', (event, d) => {
            if(vis.selected_country_id.includes(d.id)){
              vis.selected_country_id = vis.selected_country_id.filter(item => item!= d.id);
            } else if (vis.value_data['node'].map(item => item.id).includes(d.id)){
              vis.selected_country_id.push(d.id);
            } else {
              return;
            }
            vis.chart.selectAll('.country')
                .data(countries.features)
              .join('path')
                .attr('stroke', d => vis.selected_country_id.includes(d.id) ? "#333": "none")
                .attr('stroke-width', `${vis.strokeWidth}px`);
            vis.dispatcher.call('updateCountry', event, vis.selected_country_id);
          });

      // Add legend labels
      vis.legend.selectAll('.legend-label')
          .data(vis.legendStops)
        .join('text')
          .attr('class', 'legend-label')
          .attr('text-anchor', 'middle')
          .attr('dy', '.35em')
          .attr('y', 20)
          .attr('x', (d,index) => {
            return index == 0 ? 0 : vis.config.legendRectWidth;
          })
          .text(d => Math.round(d.value/(10**9)));

      vis.legend.select('#geomap-legend-title')
          .text(`Total ${vis.export_import == "export"? "Export":"Import"} Value (Billion USD$)`);

      // Update gradient for legend
      vis.linearGradient.selectAll('stop')
          .data(vis.legendStops)
        .join('stop')
          .attr('offset', d => d.offset)
          .attr('stop-color', d => d.color);

      vis.legendRect.attr('fill', 'url(#legend-gradient)');

      var zoom = d3.zoom()
          .scaleExtent([0.7, 6])
          .on('zoom', e => {
            vis.strokeWidth = 1.7/e.transform.k;
            vis.chart.selectAll('.country')
              .attr('transform', e.transform)
              .attr('stroke-width', `${vis.strokeWidth}px`);
          });

      vis.svg.call(zoom);
    }
}
