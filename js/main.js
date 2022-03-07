/**
 * Load data from CSV file asynchronously and render charts
 */

let data, locations, filteredData, selectedCountry;
let selectedTimeInterval = [1995, 2017];
let overview, treemap, stackedLineChart, geographicMap, compareGraph;
const dispatcher = d3.dispatch('filterGender');

d3.json('data/rollup_force_data.json').then(_data => {
  overview = new OverviewGraph({
    parentElement: '#overview',
  }, _data['2000']);
})

// d3.csv('data/clean_country_partner_hsproductsection_year.csv').then(_data => {
//   data = _data;
//
//   // Convert columns to numerical values
//   data.forEach(d => {
//     Object.keys(d).forEach(attr => {
//       if (attr == 'export_value' || attr === 'import_value') {
//         d[attr] = +d[attr];
//       }
//     });
//   });
//
//   filterDataByTime()
//
//
//   // lexischart.updateVis();
//   // scatterplot = new ScatterPlot({
//   //   parentElement: '#scatter-plot',
//   // }, filteredData);
//   //
//   // barchart = new BarChart({
//   //   parentElement: '#bar-chart'
//   // }, filteredData);
// });

// update the organization filter
d3.select('#country-selector').on('change', function() {
  selected = d3.select(this).property('value');
  filteredData = d3.filter(data, d => d[selected] && d.duration > 0);
  updateViews();
});


// filter the marks by gender
dispatcher.on('filterGender', (selectedGender, isActive) => {
  if (isActive) {
    d3.selectAll(`.point`).attr('opacity', 0.7).attr('disabled',false);
    d3.selectAll('.arrow, .label').style('display', d => d[selected]?'inline':'none');
  } else {
    d3.selectAll(`.point`).attr('opacity', 0.15).attr('disabled', true);
    d3.selectAll(`.point.${selectedGender}`).attr('opacity', 0.7).attr('disabled',false);
    d3.selectAll(`.arrow:not(.${selectedGender}), .label:not(.${selectedGender})`).style('display', 'none');
    d3.selectAll('.arrow, .label').style('display', a => a[selected] && a.gender === selectedGender?'inline':'none');
  }
});

function filterDataByTime() {
  filteredData = d3.filter(data, d => d.year >= selectedTimeInterval[0] && d.year <= selectedTimeInterval[1]);
}