// Filters
let countries = new Set();
let countriesSelected = [];
let export_import = 'export';
let selectedTime = 1995; // TODO: Change all selected time range into selected time
let mode = 'overview'; // overview/ exploration;

// Figures
let overview, treemap, stackedLineChart, geomap, scatterplot, barChart;
//Data
let data, timeFilteredData;

// Dispatcher
const dispatcher = d3.dispatch('updateDisplayedCountries', 'updateSelectedCountries',
    'updateTime', 'time', "updateRelationBarChart", 'updateForce');

// Read data
Promise.all([
    d3.json('data/rollup_force_data.json'),
    d3.json('data/world.json'),
    d3.csv('data/clean_country_partner_hsproductsection_year.csv'),
    d3.csv('data/merge.csv'),
    d3.csv('data/hs_product.csv')
]).then(_data => {
    data = {
        'rollupForceData': _data[0],
        'world': _data[1],
        'rawData': _data[2],
        'mergedRawData': _data[3],
        'category': _data[4]
    }
    timeFilteredData = data["rollupForceData"][selectedTime];

    console.log(timeFilteredData);

    data['mergedRawData'].forEach(d => {
        d.import_value = +d.import_value;
        d.export_value = +d.export_value;
        d.year = +d.year;
        d.country = d.location_name_short_en;
        d.product = d.hs_product_name_short_en;
    });

    data["category"] = data["category"].map(d => d.hs_product_name_short_en);

    initViews();
})

function initViews() {
    barChart = new Barchart({
        parentElement: '#country-bar-chart'
    }, {});

    // Relation graph
    overview = new OverviewGraph({
        parentElement: '#overview',
    }, timeFilteredData, barChart, dispatcher);

    // Geomap
    // TODO: change merged raw data into rollup force data
    geomap = new ChoroplethMap({
        parentElement: '#geomap',
        containerWidth: 600
    }, data["world"], timeFilteredData, export_import);

    // need to concate location, product, clean_country_partner
    scatterplot = new Scatterplot({
        parentElement: '#scatter',
        containerWidth: 600
    }, data["mergedRawData"]);

    // Country Checkboxes
    dispatcher.call('updateDisplayedCountries');
}

document.getElementById("btnradio1").addEventListener('click', () => {
    export_import = 'export'; 
    updateGeomap();
});
document.getElementById("btnradio2").addEventListener('click', () => {
    export_import = 'import'; 
    updateGeomap();
});

dispatcher.on('updateDisplayedCountries', () => {
    // Update HTML rendering, then update event listener 
    updateCountryCheckbox().then(
        function (value) {
            const inputs = document.getElementsByClassName("form-check-input");
            //console.log(inputs);
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
            }
        }
    )
});


dispatcher.on('updateTime', s => {
    selectedTime = s;
    dispatcher.call('updateDisplayedCountries');
    timeFilteredData = data["rollupForceData"][selectedTime];
    console.log(timeFilteredData);

    // geomap.value_data = timeFilteredData;
    // geomap.updateVis();

    overview.data = timeFilteredData;
    overview.updateVis();

    updateScatterplot();
})

dispatcher.on('updateSelectedCountries', allSelected => {
    if (allSelected) {
        countriesSelected = Array.from(countries).sort();
    } else {
        countriesSelected = [];
    }
    console.log(countriesSelected);
    updateScatterplot();
})


dispatcher.on('updateRelationBarChart', d=> {
    barChart.data = export_import === "export"? Object.entries(d.export):Object.entries(d.import);
    barChart.updateVis();
})

dispatcher.on('updateForce', d => {
    overview.updateForce(d);
})
function updateScatterplot() {
    if (countriesSelected.length == 0) {
        scatterplot.data = [];
    } else {
        scatterplot.data = scatterplot.fullData.filter(d => countriesSelected.includes(d.location_code));
        scatterplot.data = scatterplot.data.filter(d => d.year >= selectedTimeRange[0] && d.year <= selectedTimeRange[1]);
    }
    scatterplot.renderVis();
}

function updateGeomap() {
    geomap.export_import = export_import;
    geomap.updateVis();
}

async function updateCountryCheckbox() {
    countries.clear();
    console.log(timeFilteredData["node"]);
    timeFilteredData["node"].forEach(item => countries.add(item.id));

    console.log(countries);
    const myPromise = new Promise((resolve, reject) => {
        var countryHTML = "";
        Array.from(countries).sort().forEach(val => {
            countryHTML += `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
            <label class="form-check-label" for="flexCheckDefault">` + val + ` </label>
        </div>
    `
        });
        // console.log(countryHTML);
        resolve(countryHTML);
    })
    myPromise.then(v => {
        document.getElementById("country-filter").innerHTML = v;
    })
    //.then(() => console.log(document.getElementById("country-filter").innerHTML));
    //console.log(document.getElementById("country-filter").innerHTML);
}

// TODO: Check at most 5 countries
function checkAll() {
    d3.selectAll('.form-check-input').property('checked', true);
    dispatcher.call('updateSelectedCountries', {}, true);
}

function uncheckAll() {
    d3.selectAll('.form-check-input').property('checked', false);
    dispatcher.call('updateSelectedCountries', {}, false);
}