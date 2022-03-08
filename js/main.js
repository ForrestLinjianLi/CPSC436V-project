/**
 * Load data from CSV file asynchronously and render charts
 */

let primaryPartners, locations, filteredData, selectedTime = 1995;
let overview, treemap, stackedLineChart, geographicMap, compareGraph;
const dispatcher = d3.dispatch('updateTime');

d3.json('data/rollup_force_data.json').then(_data => {
  primaryPartners = _data;
  overview = new OverviewGraph({
    parentElement: '#overview',
  }, primaryPartners[selectedTime]);
})

dispatcher.on('updateTime', s => {
  selectedTime = s;
  overview.data = primaryPartners[selectedTime];
  overview.updateVis();
})


function filterDataByTime() {
  filteredData = d3.filter(data, d => d.year >= selectedTimeInterval[0] && d.year <= selectedTimeInterval[1]);
}