class ChoroplethMap {

    /**
     * Class constructor with basic configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _world_data, _value_data, _value_data2, _export_import) {
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 1000,
        containerHeight: _config.containerHeight || 500,
        margin: _config.margin || {top: 0, right: 200, bottom: 0, left: 0},
        tooltipPadding: 10,
        legendBottom: 50,
        legendLeft: 50,
        legendRectHeight: 12, 
        legendRectWidth: 150
      }
      this.data = _world_data;
      this.value_data = _value_data; // change
      this.value_data2 = _value_data2; // change
      this.export_import = _export_import;
      //this.mode = _mode || "overview";
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
  
      vis.colorScale = d3.scaleLinear()
          .range(['#cfe2f2', '#0d306b'])
          .interpolate(d3.interpolateHcl);
  
  
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
  
      vis.legendTitle = vis.legend.append('text')
          .attr('class', 'legend-title')
          .attr('dy', '.35em')
          .attr('y', -10)
          .text('Export value in one year')
  
      vis.updateVis();
    }
  
    updateVis() {
      let vis = this;
      
      vis.data.features.forEach(d => {
        d.properties.export_value = vis.value_data2['export'].get(d.id);
        d.properties.import_value = vis.value_data2['import'].get(d.id);
      });
 
    const exportExtent = d3.extent(vis.data.features, d => d.properties.export_value);
    //console.log(exportExtent);
    // const importtExtent = d3.extent(vis.data.features, d => d.properties.import_value);
    // const popDensityExtent = d3.extent(vis.data.objects.collection.geometries, d => d.properties.pop_density);
    
    // Update color scale
    //vis.colorScale.domain(popDensityExtent);
    vis.colorScale.domain(exportExtent);
      
    // Define begin and end of the color gradient (legend)
    vis.legendStops = [
      { color: '#cfe2f2', value: exportExtent[0], offset: 0},
      { color: '#0d306b', value: exportExtent[1], offset: 100},
    ];

    vis.renderVis();
  }


  renderVis() {
    let vis = this;

    // Convert compressed TopoJSON to GeoJSON format
    //const countries = topojson.feature(vis.data, vis.data.objects.collection)
    const countries = vis.data;
    // console.log(countries);
    // console.log(countries.features[1].properties.export_value);

    // Defines the scale of the projection so that the geometry fits within the SVG area
    vis.projection.fitSize([vis.width, vis.height], countries);

    // Append world map
    const countryPath = vis.chart.selectAll('.country')
        .data(countries.features)
      .join('path')
        .attr('class', 'country')
        .attr('d', vis.geoPath)
        .attr('fill', d => {
          if (d.properties.export_value) {
            //console.log(d.properties.export_value);
            return vis.colorScale(d.properties.export_value);
          } else {
            return 'url(#lightstripe)';
          }
        });

    countryPath
        .on('mousemove', (event,d) => {
          const export_value = d.properties.export_value ? `Export value: <strong>${d.properties.export_value}</strong> ` : 'No data available'; 
          d3.select('#tooltip')
            .style('display', 'block')
            .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
            .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
            .html(`
              <div class="tooltip-title">${d.properties.name}</div>
              <div>${export_value }</div>
            `);
        })
        .on('mouseleave', () => {
          d3.select('#tooltip').style('display', 'none');
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
        .text(d => Math.round(d.value * 10 ) / 10);

    // Update gradient for legend
    vis.linearGradient.selectAll('stop')
        .data(vis.legendStops)
      .join('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);

    vis.legendRect.attr('fill', 'url(#legend-gradient)');
  }
}
