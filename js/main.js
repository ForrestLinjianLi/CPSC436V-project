// Filters
let countries = new Set();
let countriesSelected = ['CAN'];
let export_import = 'export';
let selectedTime = 1995; 
let mode = 'overview'; // overview/ exploration;
let id2name = {};
let name2id = {};

// Figures
let overview, treemap, geomap, scatterplot, barChart, treeMapBarchat;
//Data
let data, timeFilteredData;

// Dispatcher
const dispatcher = d3.dispatch('updateCountry', 'updateTime', "updateRelationBarChart", 'updateForce');

// Load data
Promise.all([
    d3.json('data/node_link.json'),
    d3.json('data/world.json'),
    d3.csv('data/clean_country_partner_hsproductsection_year.csv'),
    d3.csv('data/year_country_product.csv'),
    d3.csv('data/hs_product.csv'),
    d3.csv('data/location.csv')
]).then(_data => {
    data = {
        'rollupForceData': _data[0],
        'world': _data[1],
        'rawData': _data[2],
        'mergedRawData': _data[3],
        'category': _data[4],
        'countryMap': _data[5]
    }

    console.log(data["countryMap"]);
    data['countryMap'].forEach(d => {
        id2name[d.location_code] = d.location_name_short_en;
        name2id[d.location_name_short_en] = d.location_code;
    });

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
    initDispatchers();
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
        parentElement: '#geomap'
    }, data["world"], timeFilteredData, export_import, countriesSelected, dispatcher);

    // init scatterplot/tree map based on mode
    determineMode();

    // add button listeners
    document.getElementById("btnradio1").addEventListener('click', () => {
        export_import = 'export';
        console.log(this);
        updateGeomap();
        determineMode();
    });
    document.getElementById("btnradio2").addEventListener('click', () => {
        export_import = 'import';
        updateGeomap();
        determineMode();
    });
}


function initDispatchers() {
    dispatcher.on('updateCountry', countries_id => {
        //console.log(countries_id);
        countriesSelected = countries_id;
        updateDisplayedCountries();
        determineMode();
    });

    dispatcher.on('updateTime', s => {
        selectedTime = s;
        timeFilteredData = data["rollupForceData"][selectedTime];
        console.log(timeFilteredData);

        updateDisplayedCountries();

        overview.data = timeFilteredData;
        overview.updateVis();

        updateGeomap();
        determineMode();
    })

    dispatcher.on('updateRelationBarChart', d=> {
        barChart.data = export_import === "export"? Object.entries(d.export):Object.entries(d.import);
        barChart.updateVis();
    })
}


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
                        countriesSelected.push(name2id[label]);
                    } else {
                        countriesSelected = countriesSelected.filter(d => d != name2id[label]);
                    }
                    //console.log(label);
                    // console.log(elem.parentNode);
                    updateGeomap();
                    determineMode();
                });
            }
            //console.log(countriesSelected);
        }
    )
}


function updateGeomap() {
    geomap.export_import = export_import;
    geomap.selected_country_id = countriesSelected;
    geomap.value_data = timeFilteredData;
    geomap.updateVis();
}

async function updateCountryCheckbox() {
    countries.clear();
    //console.log(timeFilteredData["node"]);
    timeFilteredData["node"].forEach(item => countries.add(item.id));
    countriesSelected = countriesSelected.filter(d => Array.from(countries).includes(d));

    //console.log(countries);
    const myPromise = new Promise((resolve, reject) => {
        var countryHTML = "";
        var checked = "";
        //let stillChecked = 0; // probably dont need to consider for the edge case here 
        Array.from(countries).sort().forEach(val => {
            if(countriesSelected.includes(val)) {checked = "checked"; 
                // stillChecked += 1;
            } else {checked = "";};
            countryHTML += `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault" `+ checked +`> 
            <label class="form-check-label" for="flexCheckDefault">` + id2name[val] + ` </label>
        </div>
    `
        });
        //if (stillChecked == 0) uncheckAll(); // probably dont need to consider for the edge case here 
        resolve(countryHTML);
    })
    myPromise.then(v => {
        document.getElementById("country-filter").innerHTML = v;
    })
}

// Check 5 countries
function checkAll() {
    const sel = d3.selectAll('.form-check-input');
    sel.property('checked', false);
    console.log(sel);
    countriesSelected = [];
    var randomIndexes = [];
    while(randomIndexes.length < 5 || randomIndexes.length == sel._groups[0].length){
        const randomIndex = Math.floor(Math.random() * sel._groups[0].length);
        if (!randomIndexes.includes(randomIndex)) randomIndexes.push(randomIndex);
    }
    randomIndexes.map(d => {
        sel._groups[0][d].checked = true;
        countriesSelected.push(name2id[sel._groups[0][d].parentElement.outerText]);
    });
    updateGeomap();
    determineMode();
}

// uncheck to 1 country
function uncheckAll() {
    const sel = d3.selectAll('.form-check-input');
    const randomIndex = Math.floor(Math.random() * sel._groups[0].length);
    sel.property('checked', false);
    sel._groups[0][randomIndex].checked = true;
    countriesSelected = [name2id[sel._groups[0][randomIndex].parentElement.outerText]];
    updateGeomap();
    determineMode();
}

function determineMode(){
    console.log("determine mode...")
    console.log(countriesSelected)
    if(countriesSelected.length == 1) {
        // exploration mode
        d3.select("#out").attr("background", "#a7ebbb"); // TODO: Do something to change background color and mode color
        d3.select("#scatter").html("");
        document.getElementById('modeTitle').innerHTML = "Exploration Mode";
        treemap = new TreeMap({
            parentElement: '#scatter',
            containerWidth: 1000
        }, data["mergedRawData"]);
    } else if(countriesSelected.length > 1) {
        // overview mode
        d3.select("#out").attr("background", "#f0f3f5"); // TODO: Do something to change background color and mode color
        d3.select("#scatter").html("");
        document.getElementById('modeTitle').innerHTML = "Overview Mode";
        scatterplot = new TreeMapBarChart({
            parentElement: '#scatter',
            containerWidth: 1000
        }, data["mergedRawData"]);
    }
}