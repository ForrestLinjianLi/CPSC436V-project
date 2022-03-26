// I will change this into UIWidgets later
class UIWidgets {
    constructor(_config, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 600,
            containerHeight: _config.containerHeight || 70,
            margin: _config.margin || {top: 20, right: 20, bottom: 15, left: 15},
            tooltipPadding: 10,
            legendBottom: 50,
            legendLeft: 50,
            legendRectHeight: 12,
            legendRectWidth: 150
        }
        this.dispatcher = _dispatcher;
        this.initVis();
    }

    initVis() {
    
    let vis = this;

    let slider = d3
        .sliderHorizontal()
        .domain([new Date(1995, 0, 1), new Date(2017, 0, 1)])
        .tickFormat(d3.timeFormat("%Y"))
        .ticks(23)
        .width(500)
        .displayValue(false)
        .on('onchange', (val) => {
            const updatedTimeline = [val.getFullYear(), val.getFullYear()];
            vis.dispatcher.call('updateTime', {}, updatedTimeline);
    
        });


    d3.select('#slider')
        .append('svg')
        .attr('width', 600)
        .attr('height', 100)
        .append('g')
        .attr('transform', `translate(30, 30)`)
        .call(slider);
    }

    updateVis() {
        let vis = this;

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

    }


}