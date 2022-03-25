// Filters
let countries = new Set();
let countriesSelected = [];
let export_import = 'export';
let selectedTimeRange = [1995, 2000];
let mode = 'overview'; // overview/ exploration;

// Figures
let overview, treemap, stackedLineChart, geomap, scatterplot, uiweights;
//Data
let data, timeFilteredData, rawData;

// Dispatcher
const dispatcher = d3.dispatch('updateDisplayedCountries', 'updateSelectedCountries', 'updateTime', 'time');

// Read data
Promise.all([
    d3.json('data/rollup_force_data.json'),
    d3.json('data/world.json'),
    d3.csv('data/clean_country_partner_hsproductsection_year.csv'),
    d3.csv('data/merge.csv'),
]).then(_data => {
    data = {
        'rollupForceData': _data[0],
        'world': _data[1],
        'rawData': _data[2],
        'mergedRawData': _data[3],
    }
    timeFilteredData = filterRollupForceDataByTimeRange(selectedTimeRange);
    data['world'].features.forEach(d => {
        for (let i = 0; i < data['rawData'].length; i++) {
            if (d.id === data['rawData'][i].location_code) {
                d.properties.export_value = +data['rawData'][i].export_value;
                d.properties.import_value = +data['rawData'][i].import_value;
            }
        }
    });

    data['mergedRawData'].forEach(d => {
        d.import_value = +d.import_value;
        d.export_value = +d.export_value;
        d.year = +d.year;
        d.country = d.location_name_short_en;
        d.product = d.hs_product_name_short_en;
    });

    initViews();
})

function initViews() {
    uiweights = new UIWidgets({
        parentElement: '#timeline', // Add other three filters here later
        containerWidth: 1000
    }, dispatcher);

// Relation graph
    overview = new OverviewGraph({
        parentElement: '#overview',
    }, timeFilteredData);

// Geomap
    geomap = new ChoroplethMap({
        parentElement: '#geomap',
        containerWidth: 1000
    }, data["world"]);

// need to concate location, product, clean_country_partner
    scatterplot = new Scatterplot({
        parentElement: '#scatter',
        containerWidth: 1000
    }, data["mergedRawData"]);

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
                    countriesSelected = countriesSelected.filter(d => d != label);
                }
                console.log(label);
                console.log(countriesSelected);
                // console.log(elem.parentNode);
            });
            updateScatterplot()
        }
    }, 100);

    updateCountryCheckboxex();
}

document.addEventListener("change", e => {
    if (document.getElementById("btnradio1").checked) {
        export_import = "export";
    } else {
        export_import = "import";
    }
    console.log(export_import);
})

dispatcher.on('updateTime', s => {
    selectedTimeRange = s;
    dispatcher.call('updateDisplayedCountries');
    overview.data = filterRollupForceDataByTimeRange(s)
    overview.updateVis();

    updateScatterplot()
    updateCountryCheckboxex()
})

dispatcher.on('updateSelectedCountries', allSelected => {
    if (allSelected) {
        countriesSelected = Array.from(countries).sort();
    } else {
        countriesSelected = []
    }
    console.log(countriesSelected);
    updateScatterplot();
})


function filterRollupForceDataByTimeRange(s) {
    timeFilteredData = d3.filter(Object.entries(data["rollupForceData"]), d => (parseInt(d[0]) >= selectedTimeRange[0]) && (parseInt(d[0]) <= selectedTimeRange[1]));
    return {
        "node": d3.rollups(timeFilteredData.map(d => d[1]["node"]).flat(), v => {
            return {"id": v[0].id, "partner_num": d3.sum(v, e => e.partner_num)}
        }, d => d.id).map(d => d[1]),
        "link": d3.groups(timeFilteredData.map(d => d[1]["link"]).flat(), d => d.target, d => d.source).map(d => d[1]).flat().map(d => {
            return {
                "target": d[1][0].target,
                "source": d[1][0].source,
                "export_value": d3.sum(d[1], e => e.export_value)
            }
        })
    }
}

function updateScatterplot() {
    if (countriesSelected.length == 0) {
        scatterplot.data = [];
    } else {
        scatterplot.data = scatterplot.fullData.filter(d => countriesSelected.includes(d.location_code));
        scatterplot.data = scatterplot.data.filter(d => d.year >= selectedTimeRange[0] && d.year <= selectedTimeRange[1]);
    }
    scatterplot.updateVis();
}

function checkAll() {
    d3.selectAll('.form-check-input').property('checked', true);
    dispatcher.call('updateSelectedCountries', {}, true);
}

function uncheckAll() {
    d3.selectAll('.form-check-input').property('checked', false);
    dispatcher.call('updateSelectedCountries', {}, false);
}

function updateCountryCheckboxex() {
    // country filters
    countries.clear();
    timeFilteredData["node"].forEach(item => countries.add(item.id));
    var countryHTML = "";
    Array.from(countries).sort().forEach(val => {
        countryHTML += `
      <div class="form-check">
          <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
          <label class="form-check-label" for="flexCheckDefault">` + val + ` </label>
      </div>
    `
    });
    document.getElementById("country-filter").innerHTML = countryHTML;
}
