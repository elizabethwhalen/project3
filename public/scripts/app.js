let app;
let map;
let neighborhood_markers = 
[
    {location: [44.942068, -93.020521], marker: null},
    {location: [44.977413, -93.025156], marker: null},
    {location: [44.931244, -93.079578], marker: null},
    {location: [44.956192, -93.060189], marker: null},
    {location: [44.978883, -93.068163], marker: null},
    {location: [44.975766, -93.113887], marker: null},
    {location: [44.959639, -93.121271], marker: null},
    {location: [44.947700, -93.128505], marker: null},
    {location: [44.930276, -93.119911], marker: null},
    {location: [44.982752, -93.147910], marker: null},
    {location: [44.963631, -93.167548], marker: null},
    {location: [44.973971, -93.197965], marker: null},
    {location: [44.949043, -93.178261], marker: null},
    {location: [44.934848, -93.176736], marker: null},
    {location: [44.913106, -93.170779], marker: null},
    {location: [44.937705, -93.136997], marker: null},
    {location: [44.949203, -93.093739], marker: null}
];

function init() {
    let crime_url = 'http://localhost:8000';

    app = new Vue({
        el: '#app',
        data: {
            map: {
                center: {
                    lat: 44.955139,
                    lng: -93.102222,
                    address: ""
                },
                zoom: 12,
                bounds: {
                    nw: {lat: 45.008206, lng: -93.217977},
                    se: {lat: 44.883658, lng: -92.993787}
                }
            },
            codes: [],
            neighborhoods: [],
            incidents: [],
            search_bar: "",
            code_dictionary: {},
            grouped_incidents: {},
            neighborhood_dictionary: {},
            visible_neighborhoods: [],
            markers: [],
            item: [],
            grouped_codes: {"Murder": [100, 110, 120], "Rape": [210, 220], "Robbery": [300, 311, 312, 313, 314, 321, 322, 323, 324, 331, 333, 334, 341, 342, 343, 344, 351, 352, 353, 354, 361, 363, 364, 371, 372, 373, 374], "Aggravated Assault": [400, 410, 411, 412, 420, 421, 422, 430, 431, 432, 440, 441, 442, 450, 451, 452, 453], "Burglary": [500, 510, 511, 513, 515, 516, 520, 521, 523, 525, 526, 530, 531, 533, 535, 536, 540, 541, 543, 545, 546, 550, 551, 553, 555, 556, 560, 561, 563, 565, 566], "Theft": [600, 603, 611, 612, 613, 614, 621, 622, 623, 630, 631, 632, 633, 640, 641, 642, 643, 651, 652, 653, 661, 662, 663, 671, 672, 673, 681, 682, 683, 691, 692, 693], "Motor Vehicle Theft": [700, 710, 711, 712, 720, 721, 722], "Assault": [810, 861, 862, 863], "Arson": [900, 901, 903, 905, 911, 913, 915, 921, 922, 923, 925, 931, 933, 941, 942, 951, 961, 971, 972, 975, 981, 982], "Criminal Damage to Property": [1400, 1410, 1420, 1430], "Graffiti": [1401, 1415, 1416, 1425, 1426, 1435, 1436], "Narcotics": [1800, 1810, 1811, 1812, 1813, 1814, 1815, 1820, 1822, 1823, 1824, 1825, 1830, 1835, 1840, 1841, 1842, 1843, 1844, 1845, 1850, 1855, 1860, 1865, 1870, 1880, 1885], "Weapons": [2619], "Death - Investigation of a Death": [3100], "Proactive Police Visit": [9954], "Community Engagement Event": [9959], "Proactive Foot Patrol": [9986]},
            selected_incidents:[],
            selected_neighborhoods: [],
            count_incidents: {},
            
            start_date: "2014-08-14",
            end_date: "2021-09-30",
            start_time: "00:00:00",
            end_time: "23:59:59",
            num_crimes: 1000
        },

        methods: {
            tableColor(incidents) {
                //console.log(incidents);
                if(incidents == "Murder" || incidents == "Homicide" || incidents == "Simple Asasult Dom." || incidents == "Discharge" || incidents == "Agg. Assault Dom." || incidents == "Agg. Assault" || incidents == "Rape") {
                    return 'violentCrimeColor'
                }
                else if(incidents == "Theft" || incidents == "Auto Theft" || incidents == "Burglary" || incidents == "Vandalism" || incidents == "Robbery" || incidents == "Graffiti" || incidents == "Arson") {
                    return 'propertyCrimeColor';
                }
                else {
                    return 'otherCrimeColor'
                }
            },

            renderIncidents(incidents) {
               // console.log(incidents);
                let arr = incidents.incident_type.split(',');
                if(! (arr[0] in app.grouped_incidents) ){
                    app.grouped_incidents[arr[0]] = [incidents.code];
                }
                else {

                    app.grouped_incidents[arr[0]].push(incidents.code);
                }

                //console.log(app.grouped_incidents);
            }
        }
    });



    map = L.map('leafletmap').setView([app.map.center.lat, app.map.center.lng], app.map.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 11,
        maxZoom: 18
    }).addTo(map);
    map.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);
    
    map.on("moveend",updateMap);

    let district_boundary = new L.geoJson();
    district_boundary.addTo(map);

    getJSON('data/StPaulDistrictCouncil.geojson').then((result) => {
        // St. Paul GeoJSON
        $(result.features).each(function(key, value) {
            district_boundary.addData(value);
        });
    }).catch((error) => {
        console.log('Error:', error);
    });

    getJSON('/codes').then((result) =>{
        app.codes = result;
        let codeArr = {};
        for(i = 0; i<app.codes.length; i++){
            codeArr[app.codes[i].code] = app.codes[i].type;
           // app.code_dictionary[app.codes[i].code] = app.codes[i].type;
        }
        app.codeArr = codeArr;

    }).catch((error) => {
        console.log('Error: ', error);
    });

    getJSON('/neighborhoods').then((result) =>{
        app.neighborhoods = result;
        let neighborhoodDictionary = {};
        for(i = 0; i<app.neighborhoods.length; i++){
            neighborhoodDictionary[app.neighborhoods[i].neighborhood_number] = app.neighborhoods[i].neighborhood_name;
        }
        app.neighborhood_dictionary = neighborhoodDictionary;

    }).catch((error) => {
        console.log('Error: ', error);
    });
    updateMap();

}



function getJSON(url) {
   // console.log("url: " + url);
    return new Promise((resolve, reject) => {
        $.ajax({
            dataType: "json",
            url: url,
            success: function(data) {
                resolve(data);
            },
            error: function(status, message) {
                reject({status: status.status, message: status.statusText});
            }
        });
    });
}

function updateMap() {
    //updateMap should update the map
    //These three functions help update the map
    updateVisibleNeighborhoods();
    updateMarkers();
    getIncidents();
}

//This function should update the map to show the visible neighborhoods only
function updateVisibleNeighborhoods(){
    let visibleNeighborhoods = [];
    for(let i = 0; i < neighborhood_markers.length; i++) {
        if (neighborhood_markers[i].location[1]  < map.getBounds().getEast() && neighborhood_markers[i].location[1]  > map.getBounds().getWest()
        && neighborhood_markers[i].location[0]  < map.getBounds().getNorth() && neighborhood_markers[i].location[0] > map.getBounds().getSouth()) {
            visibleNeighborhoods.push(i+1);
        }
    }
    console.log("map interaction finished: " + visibleNeighborhoods);
    app.visible_neighborhoods = visibleNeighborhoods;
}

//This function should only update the visible markers on the map
function updateMarkers() {
    while(app.markers.length > 0) {
        map.removeLayer(app.markers.pop())
    }
    for(let i = 0; i<app.visible_neighborhoods.length; i++){
        //app.markers.push(L.marker(neighborhood_markers[i].location).addTo(map).bindPopup("test").openPopup()); //pop ups work

        app.markers.push(map.addLayer(L.marker(neighborhood_markers[i].location).bindPopup(app.neighborhood_dictionary[i+1] + ": " + app.count_incidents[app.neighborhood_dictionary[i+1]]).openPopup())); //table works
        // + ": " + count_incidents[app.neighborhood_dictionary[i+1]]
    }

}


function getIncidents() {
    if (app.visible_neighborhoods.length > 0) {
        let incSearch = "/incidents?id=" + (app.visible_neighborhoods[0] + 1);
        for(let i = 1; i < app.visible_neighborhoods.length; i++) {
            incSearch = incSearch + "," + (app.visible_neighborhoods[i] + 1);
        }
        getJSON(incSearch).then((result) =>{
            app.incidents = result;

            let i;
            for(i = 0; i<app.visible_neighborhoods.length;i++){
                let j;
                let count=0;
                for(j=0;j<app.incidents.length; j++){
                    if(i+1== app.incidents[j].neighborhood_number){
                        count = count + 1;
                    }
                   // app.count_incidents[app.incidents[j].neighborhood_name] = count;
                }
                //console.log(app.neighborhood_dictionary[i+1] + " : " + count + ' total crimes');
                app.count_incidents[app.neighborhood_dictionary[i+1]] = count;
                //console.log("in loop");
                //app.markers[i].bindPopup('Neighborhood ' +(i+1) + ': ' +count + ' total crimes');
                //app.markers[i].bindPopup(app.neighborhood_dictionary[i+1] + ': ' +count + ' total crimes');
                //app.markers)i).bindPopup(app.neighborhood_dictionary[i+1] + ': ' +count + ' total crimes').addTo(map); //what we had before
                //app.markers[i].bindPopup(app.neighborhood_dictionary[i+1] + ': ' +count + ' total crimes').openPopup();
            }
        }).catch((error) => {
            console.log('Error:', error);
        });
    }
    else
    {
        getJSON('/incidents').then((result) =>{
            app.incidents = result;

            let i;
            for(i = 0; i<app.visible_neighborhoods.length;i++){
                let j;
                let count=0;
                for(j=0;j<app.incidents.length; j++){
                    if(i+1== app.incidents[j].neighborhood_number){
                        count = count + 1;
                    }
                }
                neighborhood_markers[i].marker.bindPopup('Neighborhood ' +(i+1) + ': ' +count + ' total crimes');
            }
        }).catch((error) => {
            console.log('Error:', error);
        });
    }
}

function updateQuery(){
    /*
    console.log("selected_incidents: " + app.selected_incidents);
    console.log("selected_neighborhoods: " + app.selected_neighborhoods);
    console.log("num_crimes: " + app.num_crimes);
    console.log("start_time: " + app.start_time);
    console.log("end_time: " + app.end_time);
    console.log("start_date: " + app.start_date);
    console.log("end_date: " + app.end_date);*/

    for(let key in app.neighborhood_dictionary){
       // console.log("key: " + key + " value: " + app.neighborhood_dictionary[key]);
    }
    
    let n = [];
    let string_n = "";
    for(let key in app.neighborhood_dictionary){
        for(let neighborhood in app.selected_neighborhoods){
            if(app.neighborhood_dictionary[key] == app.selected_neighborhoods[neighborhood]){
                n.push(key);
            }
        }
    }

   let inc = [];
   let string_i = "";

   
   for(item in app.grouped_codes){
       //console.log("Key: " + item + "  value: " + app.grouped_codes[item]);
       for(let incident in app.selected_incidents){
           if(item == app.selected_incidents[incident]){
               for(c in app.grouped_codes[item]){
                   inc.push(app.grouped_codes[item][c]);
               }
               //inc.push(item);
           }
       }
   }
   
    
    for(let i = 0; i<inc.length; i++){//item in n){
        if(i == inc.length - 1){
            string_i = string_i + inc[i];
            //console.log("string: " + string_n);
        }
        else{
            string_i = string_i + inc[i] + ",";
            //console.log("string: " + string_n);
        }
    }


    for(let i = 0; i<n.length; i++){//item in n){
        if(i == n.length - 1){
            string_n = string_n + n[i];
            //console.log("string: " + string_n);
        }
        else{
            string_n = string_n + n[i] + ",";
            //console.log("string: " + string_n);
        }
    }

    //console.log("neighborhood_string = " + string_n);
    console.log("code=" + string_i);

    let url = "/incidents?neighborhood=" + string_n + "&start_date=" + app.start_date + "T" + app.start_time + "&end_date=" + app.end_date + "T" + app.end_time + "&limit=" + app.num_crimes + "&code=" + string_i;
    getJSON(url).then((result) =>{
        console.log("url: " + url);
        app.incidents = result;
        //console.log("submit result: " + result);
        }).catch((error) => {
            console.log('Error:', error);
    });
}


function search() {
    let query = app.search_bar;
    let newStr = query.replace(',', '');
    //console.log("query: " + newStr);
    let split_query = newStr.split(" ");
    let new_query = "";
    let number = true;
    for (let i = 0; i<split_query.length; i++){
        if(i == split_query.length -1){
            new_query = new_query + split_query[i];
            if(isNaN(split_query[i]) == true){
                console.log("nan: " + split_query[i]);
                number = false;
            }
        }
        else{
            new_query = new_query + split_query[i] + "+";
            if(isNaN(split_query[i]) ==true){
                console.log("nan: " + split_query[i]);
                number = false;
            }
        }
    }
    if(number == false){
        getJSON('https://nominatim.openstreetmap.org/search?format=json&q=' + new_query + '+Saint+Paul+Minnesota').then((result) => {
            console.log(result);
            if (result.length == 0)
            {
                console.log('Error: no such address or object');
                app.search_bar = "";
            }
            else
            {
                app.map.center.lat = parseFloat(result[0].lat);
                app.map.center.lng = parseFloat(result[0].lon);
                console.log(app.map.center.lat);
                map = map.panTo(new L.LatLng(app.map.center.lat, app.map.center.lng));
                map.setZoom(17);
                app.search_bar = result[0].display_name;
                app.map.center.address = result[0].display_name;
                updateMap();
                //console.log(app.map.bounds.nw);
            }
        });
    }
    if(number == true){
        getJSON('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + split_query[0] + '&lon=' + split_query[1]).then((result) => {
            if (result.length == 0)
            {
                console.log('Error: no such address or object');
                app.search_bar = "";
            }
            else
            {
                //app.map.center.lat = parseFloat(result[0].lat);
                //app.map.center.lng = parseFloat(result[0].lon);
                app.map.center.lat = parseFloat(result.lat);
                app.map.center.lng = parseFloat(result.lon);
                console.log(app.map.center.lat);
                map = map.panTo(new L.LatLng(app.map.center.lat, app.map.center.lng));
                map.setZoom(17);
                app.search_bar = result[0].display_name;
                app.map.center.address = result[0].display_name;
                updateMap();
                //console.log(app.map.bounds.nw);
            }
        });
    }
}