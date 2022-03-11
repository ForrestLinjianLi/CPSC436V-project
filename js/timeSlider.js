// I will change this into UIWidgets later
class TimeSlider {

    constructor(_config) {
        this.config = {
          parentElement: _config.parentElement,
          containerWidth: _config.containerWidth || 600,
          containerHeight: _config.containerHeight || 700,
          margin: _config.margin || {top: 0, right: 0, bottom: 0, left: 0},
          tooltipPadding: 10,
          legendBottom: 50,
          legendLeft: 50,
          legendRectHeight: 12, 
          legendRectWidth: 150
        }

        this.initVis();
      }

    initVis() {
        let vis = this;

    var margin = {top: 20, right: 40, bottom: 50, left: 40},
    width = 800 - margin.left - margin.right,
    height = 150 - margin.top - margin.bottom;

    var x = d3.scaleTime()
        .domain([new Date(1997, 1, 1), new Date(2017, 1, 1) ])
        //.domain([new Date(2013, 7, 1), new Date(2013, 7, 15) - 1])
        .rangeRound([0, width]);
    
    var svg = d3.select(vis.config.parentElement).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    svg.append("g")
        .attr("class", "axis axis--grid")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x)
            .ticks(d3.timeYear)
            .tickSize(-height)
            .tickFormat(function() { return null; }))
      .selectAll(".tick")
        .classed("tick--minor", function(d) { return d.getHours(); });
    
    svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x)
            .ticks(d3.timeYear)
            .tickPadding(0))
        .attr("text-anchor", null)
      .selectAll("text")
        .attr("x", 6);
    
    svg.append("g")
        .attr("class", "brush")
        .call(d3.brushX()
            .extent([[0, 0], [width, height]])
            .on("end", brushended));
    
    function brushended(event, d) {
      //if (!d3.event.sourceEvent) return; // Only transition after input.
      //if (!d3.event.selection) return; // Ignore empty selections.
      var d0 = d3.event.selection.map(x.invert),
          d1 = d0.map(d3.timeYear.round);
    
      // If empty when rounded, use floor & ceil instead.
      if (d1[0] >= d1[1]) {
        d1[0] = d3.timeYear.floor(d0[0]);
        d1[1] = d3.timeYear.offset(d1[0]);
      }
    
      // console.log(d0);
      // console.log(d1);
      d3.select(this).transition().call(d3.event.target.move, d1.map(x));
    }
        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

    }


      
}