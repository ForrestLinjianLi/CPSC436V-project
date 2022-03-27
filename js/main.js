// Filters
let countries = new Set();
let countriesSelected = ['CAN'];
let export_import = 'export';
let selectedTime = 1995; // TODO: Change all selected time range into selected time
let mode = 'overview'; // overview/ exploration;

// Figures
let overview, treemap, stackedLineChart, geomap, scatterplot, barChart;
//Data
let data, timeFilteredData;

// Dispatcher
const dispatcher = d3.dispatch('updateTime', "updateRelationBarChart", 'updateForce');
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
    // Country Checkboxes
    updateDisplayedCountries();

    // Relation graph
    overview = new OverviewGraph({
        parentElement: '#overview',
    }, timeFilteredData, barChart, dispatcher);

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
            for (const input of inputs) {
                input.addEventListener('click', (event) => {
                    const elem = event.currentTarget;
                    const label = elem.parentNode.outerText;
                    if (elem.checked) {
                        countriesSelected.push(label);
                    } else {
                        countriesSelected = countriesSelected.filter(d => d != label);
                    }
                    //console.log(label);
                    //console.log(countriesSelected);
                    // console.log(elem.parentNode);
                    determineMode();
                });
            }
            //console.log(countriesSelected);
        }
    )
};


dispatcher.on('updateTime', s => {
    updateDisplayedCountries();
    selectedTime = s;
    timeFilteredData = data["rollupForceData"][selectedTime];
    console.log(timeFilteredData);

    geomap.value_data = timeFilteredData;
    geomap.updateVis();

    overview.data = timeFilteredData;
    overview.updateVis();

    determineMode();

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
        let checked = "";
        let stillChecked = 0;
        Array.from(countries).sort().forEach(val => {
            if(countriesSelected.includes(val)) {checked = "checked"; stillChecked += 1;} else {checked = "";};
            countryHTML += `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault" `+ checked +`>
            <label class="form-check-label" for="flexCheckDefault">` + val + ` </label>
        </div>
    `
        });
        if (stillChecked == 0) uncheckAll();
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
    countriesSelected = [];
    for (let i = 0; i < 5; i++) {
        sel._groups[0][i].checked = true;
        countriesSelected.push(sel._groups[0][i].parentElement.outerText);
    }
    console.log(countriesSelected);
    determineMode();

}

// uncheck to 1 country
function uncheckAll() {
    const sel = d3.selectAll('.form-check-input');
    sel.property('checked', false);
    sel._groups[0][0].checked = true;
    countriesSelected = [];
    countriesSelected.push(sel._groups[0][0].parentElement.outerText);
    console.log(countriesSelected);
    determineMode();
}

function determineMode(){
    console.log("determine mode...")
    if(countriesSelected.length == 1) {
        // exploration mode
        d3.select("#out").attr("background", "#a7ebbb"); // TODO: Do something to change background color and mode color
        d3.select("#scatter").html("");
        document.getElementById('modeTitle').innerHTML = "Exploration Mode";
        treemap = new TreeMap({
            parentElement: '#scatter',
            containerWidth: 600
        }, data["mergedRawData"]);
    } else if(countriesSelected.length > 1) {
        // overview mode
        d3.select("#out").attr("background", "#f0f3f5"); // TODO: Do something to change background color and mode color
        d3.select("#scatter").html("");
        document.getElementById('modeTitle').innerHTML = "Overview Mode";
        scatterplot = new Scatterplot({
            parentElement: '#scatter',
            containerWidth: 600
        }, data["mergedRawData"]);
    }
}