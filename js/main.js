// Filters
let countries = new Set();
let countriesSelected = ['CAN'];
let export_import = 'export';
let selectedTimeRange = [1995, 1995];
let selectedTime = 1995; // TODO: Change all selected time range into selected time
let mode = 'overview'; // overview/ exploration;

// Figures
let overview, treemap, stackedLineChart, geomap, scatterplot, uiweights;
//Data
let data, timeFilteredData;

// Dispatcher
const dispatcher = d3.dispatch('updateTime');

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
    timeFilteredData = filterDataByTimeRange(selectedTimeRange);

    console.log(timeFilteredData);

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
    // Country Checkboxes
    updateDisplayedCountries();

    // Timeline 
    uiweights = new UIWidgets({
        parentElement: '#slider', // Add other three filters here later
    }, dispatcher);

    // Relation graph
    overview = new OverviewGraph({
        parentElement: '#overview',
    }, timeFilteredData);

    // Geomap
    geomap = new ChoroplethMap({
        parentElement: '#geomap',
        containerWidth: 600
    }, data["world"], timeFilteredData, export_import);

    // need to concate location, product, clean_country_partner
    // scatterplot = new Scatterplot({
    //     parentElement: '#scatter',
    //     containerWidth: 600
    // }, data["mergedRawData"]);

    // treeMap
    treemap = new TreeMap({
        parentElement: '#scatter',
        containerWidth: 600
    }, data["mergedRawData"]);

}

document.getElementById("btnradio1").addEventListener('click', () => {
    export_import = 'export';
    console.log(export_import);
    updateGeomap();
    determineMode();
});
document.getElementById("btnradio2").addEventListener('click', () => {
    export_import = 'import';
    console.log(export_import);
    updateGeomap();
    determineMode();});

function updateDisplayedCountries() {
    // Update HTML rendering, then update event listener 
    updateCountryCheckbox().then(
        function (value) {
            const inputs = document.getElementsByClassName("form-check-input");
            d3.selectAll('.form-check-input')._groups[0][0].checked  = true;
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
                    determineMode();
                });
            }
        }
    )
};


dispatcher.on('updateTime', s => {
    selectedTimeRange = s;
    updateDisplayedCountries();
    timeFilteredData = filterDataByTimeRange(s);
    console.log(timeFilteredData);

    geomap.value_data = timeFilteredData;
    geomap.updateVis();

    overview.data = timeFilteredData;
    overview.updateVis();

    determineMode();

})

function updateSelectedCountries(allSelected) {
    if (allSelected) {
        countriesSelected = Array.from(countries).sort();
    } else {
        countriesSelected = [];
    }
    console.log(countriesSelected);
    determineMode();
}



function filterDataByTimeRange(s) {
    const tempTimeFilteredData = d3.filter(Object.entries(data["rollupForceData"]), d => (parseInt(d[0]) >= selectedTimeRange[0]) && (parseInt(d[0]) <= selectedTimeRange[1]));
    const tempTimeFilteredData2 = data['rawData'].filter(d => ((selectedTimeRange[0] <= parseInt(d.year)) && (parseInt(d.year) <= selectedTimeRange[1])));
    return {
        "node": d3.rollups(tempTimeFilteredData.map(d => d[1]["node"]).flat(),
                    v => { return {
                          "id": v[0].id,
                          "partner_num": d3.sum(v, e => e.partner_num)}
                    }, d => d.id)
                  .map(d => d[1]),
        "link": d3.groups(tempTimeFilteredData.map(d => d[1]["link"]).flat(), d => d.target, d => d.source)
                  .map(d => d[1]).flat()
                  .map(d => { return {
                        "target": d[1][0].target,
                        "source": d[1][0].source,
                        "export_value": d3.sum(d[1], e => e.export_value),}
                  }),
        "export": d3.rollup(tempTimeFilteredData2, v => d3.sum(v, d => d.export_value), d => d.location_code),
        "import": d3.rollup(tempTimeFilteredData2, v => d3.sum(v, d => d.import_value), d => d.location_code),
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

function updateTreeMap() {
    if (countriesSelected.length == 0) {
        treemap.data = [];
    } else {
        treemap.data = scatterplot.fullData.filter(d => countriesSelected.includes(d.location_code));
        treemap.data = scatterplot.data.filter(d => d.year >= selectedTimeRange[0] && d.year <= selectedTimeRange[1]);
    }
    treemap.updateVis();
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
        resolve(countryHTML);
    })
    myPromise.then(v => {
        document.getElementById("country-filter").innerHTML = v;
    })
    //.then(() => console.log(document.getElementById("country-filter").innerHTML));
    //console.log(document.getElementById("country-filter").innerHTML);
}

// Check 5 countries
function checkAll() {
    const sel = d3.selectAll('.form-check-input');
    for (let i = 0; i < 5; i++) {
        sel._groups[0][i].checked = true;
    }
    updateSelectedCountries(true);
    
}

// uncheck to 1 country
function uncheckAll() {
    const sel = d3.selectAll('.form-check-input');
    sel.property('checked', false);
    sel._groups[0][0].checked = true;
    updateSelectedCountries(false);
    determineMode();
}

function determineMode(){
    console.log("determine mode...")
    if(countriesSelected.length == 1) {
        // exploration mode
        d3.select("#scatter").html("");
        document.getElementById('modeTitle').innerHTML = "Exploration Mode";
        treemap = new TreeMap({
            parentElement: '#scatter',
            containerWidth: 600
        }, data["mergedRawData"]);
    } else if(countriesSelected.length > 1) {
        // overview mode
        d3.select("#scatter").html("");
        document.getElementById('modeTitle').innerHTML = "Overview Mode";
        scatterplot = new Scatterplot({
            parentElement: '#scatter',
            containerWidth: 600
        }, data["mergedRawData"]);
    }
}