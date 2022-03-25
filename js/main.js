/**
 * Load data from CSV file asynchronously and render charts
 */


// Filters 
let countries = new Set();
let countriesSelected = [];
let export_import = 'export'; 
let timeline, mode;

// Figures
let primaryPartners, filteredData, selectedTimeRange = [1995, 2000];
let overview, treemap, stackedLineChart, geomap, scatterplot;
let timeFilteredData;

// Dispatcher
const dispatcher = d3.dispatch('updateDisplayedCountries', 'updateSelectedCountries', 'updateTime', 'time');

// Filters
mode = 'overview'; // overview/ exploration
document.addEventListener("change", e => {
  if (document.getElementById("btnradio1").checked) {
    export_import = "export";
  } else {
    export_import = "import";
  }
  console.log(export_import);
})

let uiweights = new UIWidgets({
  parentElement: '#timeline', // Add other three filters here later
  containerWidth: 1000
}, dispatcher);


d3.json('data/rollup_force_data.json').then(_data => {
  // country filters
  for (let i = selectedTimeRange[0]; i <= selectedTimeRange[1]; i++) {
    _data[i].node.map(a => a.id).forEach(item => countries.add(item));
  }

  var countryHTML = "";
  Array.from(countries).sort().forEach(val => {
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

dispatcher.on('updateDisplayedCountries', () => {
  // country filters
  countries.clear();
  
  for (let i = 0; i < timeFilteredData.length; i++) {
    timeFilteredData[i][1].node.map(a => a.id).forEach(item => countries.add(item));
  }

  var countryHTML = "";
  Array.from(countries).sort().forEach(val => {
    countryHTML += `
      <div class="form-check">
          <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
          <label class="form-check-label" for="flexCheckDefault">` + val + ` </label>
      </div>
    `});

  document.getElementById("country-filter").innerHTML = countryHTML;
});


dispatcher.on('updateTime', s => {
  selectedTimeRange = s;
  console.log(selectedTimeRange);

  timeFilteredData = d3.filter(Object.entries(primaryPartners), d => (parseInt(d[0]) >= selectedTimeRange[0]) && (parseInt(d[0]) <= selectedTimeRange[1]));
  console.log(timeFilteredData);
  dispatcher.call('updateDisplayedCountries');

  overview.data = {
    "node": d3.rollups(timeFilteredData.map(d => d[1]["node"]).flat(), v => {return {"id": v[0].id, "partner_num": d3.sum(v, e => e.partner_num)}}, d => d.id).map(d => d[1]),
    "link": d3.groups(timeFilteredData.map(d => d[1]["link"]).flat(), d => d.target, d => d.source).map(d => d[1]).flat().map(d => {return {"target": d[1][0].target, "source": d[1][0].source, "export_value": d3.sum(d[1], e=>e.export_value)}})
  }
  overview.updateVis();
})

dispatcher.on('updateSelectedCountries', allSelected => {
  if (allSelected) {
    countriesSelected = Array.from(countries).sort();
  } else {
    countriesSelected = []
  }
  console.log(countriesSelected);
})

// TODO: Do we need this?
function filterDataByTime() {
  filteredData = d3.filter(data, d => d.year >= timeline[0] && d.year <= timeline[1]);
}

function checkAll() {
  d3.selectAll('.form-check-input').property('checked', true); 
  dispatcher.call('updateSelectedCountries', {}, true);
}
function uncheckAll() {
  d3.selectAll('.form-check-input').property('checked', false);
  dispatcher.call('updateSelectedCountries', {}, false);
}

setTimeout(() => {
  //const inputs = document.querySelectorAll('.form-check');
  const inputs = document.getElementsByClassName("form-check-input");
  // console.log(inputs[0].checked);
  for (const input of inputs) {
    input.addEventListener('click', (event) => {
      const elem = event.currentTarget;
      const label = elem.parentNode.outerText;
      if (elem.checked) {
        countriesSelected.push(label);
      } else {
        countriesSelected = countriesSelected.filter(d => d!=label);
      }
      console.log(label);
      console.log(countriesSelected);
      // console.log(elem.parentNode);
    });
  }
}, 100);
