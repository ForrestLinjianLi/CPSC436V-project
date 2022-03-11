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


        vis.updateVis();
    }

    updateVis() {

    }

    renderVis() {
        // let vis = this;

      }

      
}