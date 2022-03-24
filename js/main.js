/**
 * Load data from CSV file asynchronously and render charts
 */


// Filters 
let countries = new Set();
let timeline, export_import, mode;

// Figures
let primaryPartners, filteredData, selectedTimeRange = [1995, 2000];
let overview, treemap, stackedLineChart, geomap, scatterplot;

// Dispatcher
const dispatcher = d3.dispatch('updateTime', 'time');

// Filters
export_import = 'export'; // export/ import
mode = 'overview'; // overview/ exploration

function checkAll() {
  d3.selectAll('input').property('checked', true);
}
function uncheckAll() {
  d3.selectAll('input').property('checked', false);
}

let uiweights = new UIWidgets({
  parentElement: '#timeline', // Add other three filters here later
  containerWidth: 1000
}, dispatcher);

let print_data;

d3.json('data/rollup_force_data.json').then(_data => {
  // country filters
  for (let i = selectedTimeRange[0]; i <= selectedTimeRange[1]; i++) {
    _data[i].node.map(a => a.id).forEach(item => countries.add(item));
  }

  var countryHTML = "";
  countries.forEach(val => {
    countryHTML += `
      <div class="form-check">
          <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
          <label class="form-check-label" for="flexCheckDefault">` + val + ` </label>
      </div>
    `});

  document.getElementById("country-filter").innerHTML = countryHTML;



// Relation graph
  primaryPartners = _data;
  overview = new OverviewGraph({
    parentElement: '#overview',
  }, primaryPartners[1995]);
})

// Geomap
 Promise.all([
  d3.json('data/africa.json'),
  d3.csv('data/region_population_density.csv'),
  d3.json('data/world.json'),
  d3.csv('data/clean_country_partner_hsproductsection_year.csv'),
]).then(data => {

  const geoData = data[0];
  const countryData = data[1];
  let worldGeoData = data[2];
  const countryPartnerData = data[3];

  console.log(geoData);
  console.log(worldGeoData);
  console.log(geoData.objects.collection.geometries.length);
  console.log(countryData.length);
  console.log(worldGeoData.features.length);
  console.log(countryPartnerData.length);


  // Already geodata, not topodata
  worldGeoData.features.forEach(d => {
    for (let i = 0; i < countryPartnerData.length; i++) {
      if(d.id == countryPartnerData[i].location_code) {
        d.properties.export_value = +countryPartnerData[i].export_value;
        d.properties.import_value = +countryPartnerData[i].import_value;
      }
    }
  });

  // Combine both datasets by adding the population density to the TopoJSON file
  geoData.objects.collection.geometries.forEach(d => {
    for (let i = 0; i < countryData.length; i++) {
      if (d.properties.name == countryData[i].region) {
        d.properties.pop_density = +countryData[i].pop_density;
      }
    }
  });

  geomap = new ChoroplethMap({
    parentElement: '#geomap',
    containerWidth: 1000
  },  worldGeoData);
})
.catch(error => console.error(error));


dispatcher.on('updateTime', s => {
  selectedTimeRange = s;
  const selectedData = d3.filter(Object.entries(primaryPartners), d => (parseInt(d[0]) >= s[0]) && (parseInt(d[0]) <= s[1]));
  overview.data = {
    "node": d3.rollups(selectedData.map(d => d[1]["node"]).flat(), v => {return {"id": v[0].id, "partner_num": d3.sum(v, e => e.partner_num)}}, d => d.id).map(d => d[1]),
    "link": d3.groups(selectedData.map(d => d[1]["link"]).flat(), d => d.target, d => d.source).map(d => d[1]).flat().map(d => {return {"target": d[1][0].target, "source": d[1][0].source, "export_value": d3.sum(d[1], e=>e.export_value)}})
  }
  overview.updateVis();
})