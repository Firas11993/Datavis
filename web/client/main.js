const API_URL = 'http://127.0.0.1:5000'
const COLOR_BEST = 'green';
const COLOR_WORST = 'red';

// Source: <https://davidwalsh.name/javascript-debounce-function>
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.

function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

function onStationClick(station) {
    sidebar.open('home');
    var url = new URL(`${API_URL}/get_station_info/${station.Name}`)
    var template = () => `<h1>${station.Name}</h1>${content}`;
    var content = `  <b>(Commune: ${station.Commune})<b>`;
    content += '<br><button onclick="showPathsFromStop(\'' + station.Name + '\')">Set starting location</button>';
    var wikiurl = "https://en.wikipedia.org/api/rest_v1/page/summary/";
    var sidebarContent = document.getElementById("sidebarContent");
    fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        if (resp.important) {
            content += '<h2>Interesting locations:</h2>';
            for (let [city, tags] of Object.entries(resp.cities)) {
                content += `<li>${city} <span>`;
                content += tags.map(item => `<span class="tag ${item}">${item}</span>`).join('');
                content += '</span></li>';
                if (wikiurl.endsWith('/'))
                    wikiurl += city;
            }
        }

        sidebarContent.innerHTML = template()
    }).then(function(){
        fetch(new URL(wikiurl)).then(async function(response) {

            return response.json();
        }).then(function(resp) {

            if ('extract' in resp) {
                content += '<h2>Summary:</h2><p>';
                for (let descr of resp.extract)
                    content +=  descr ;

                content += '</p>';
            }

            wikiurl = "https://en.wikipedia.org/api/rest_v1/page/summary/";
            sidebarContent.innerHTML = template()

        });
    });



    return template();
}

// Source: <https://stackoverflow.com/a/321527/1460652>
function partial(func /*, 0..n args */) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
        var allArguments = args.concat(Array.prototype.slice.call(arguments));
        return func.apply(this, allArguments);
    };
}

var data = france;
var map;
var sidebar;

function setupMap() {
    var lat = 46.566414;
    var lng =  2.4609375;
    var zoom =  6;

    map = new L.Map('map', {minZoom: 6, maxZoom: 11, zoomControl: false});
    new L.Control.Zoom({position: 'bottomright'}).addTo(map);
    var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var osmAttrib='Map data &copy; OpenStreetMap contributors';
    var osm = new L.TileLayer(osmUrl, {minZoom: 6, maxZoom: 8, attribution: osmAttrib});
    map.addLayer(osm);

    sidebar = L.control.sidebar('sidebar', {
        position: 'left',
        autopan: false,       // whether to maintain the centered map point when opening the sidebar
        closeButton: true,    // whether t add a close button to the panes
    }).addTo(map);


    map.setView(new L.LatLng(lat, lng), zoom);

    L.geoJson(france_shape, {
        clickable: false,
        invert: true,
        style: { fillColor: '#000', fillOpacity: 0.2, weight: 0 },
    }).addTo(map);

    L.tileLayer('https://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.outdoors',
        accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
    }).addTo(map);

    var mapMarkers = L.layerGroup().addTo(map);

    var showBounds = debounce(function() {
        var bounds = map.getBounds()
        var url = new URL(`${API_URL}/get_stations`)
        var params = {east: bounds.getEast(), west: bounds.getWest(), north: bounds.getNorth(), south: bounds.getSouth(), zoom: map.getZoom()}
        url.search = new URLSearchParams(params)
        fetch(url).then(function(response) {
            return response.json();
        }).then(function(stations) {
            mapMarkers.clearLayers()
            for (let [id, station] of Object.entries(stations)) {
                important_city = station.Imp;
                L.circleMarker([station.Latitude, station.Longitude], {
                    radius: important_city && map.getZoom() * 1.5 || map.getZoom(),
                    color: important_city && '#3498db' || '#95a5a6',
                    fillColor: important_city && '#3498db' || '#95a5a6',
                    fillOpacity: 0.2
                }).addTo(mapMarkers).on('click', partial(onStationClick, station));
            }
        });
    }, 125);


    map.on('moveend', () => { showBounds(); });
    showBounds()

    // add a layer group, yet empty

    //  var markersLayer = new L.LayerGroup();
    //  map.addLayer(markersLayer);

    var featuresLayer = new L.GeoJSON(data, {
        style: {
            opacity: 0,
            fillOpacity: 0,
        }
    });

    map.addLayer(featuresLayer);

    // add the search bar to the map
    var controlSearch = new L.Control.Search({
        position: 'topright',    // where do you want the search bar?
        layer: featuresLayer,
        propertyName: 'nom',
        initial: false,
        marker: false,
        textPlaceholder: 'Search by departement', // placeholder while nothing is searched
        collapsed: false,
        moveToLocation: function(latlng, title, map) {
            //map.fitBounds( latlng.layer.getBounds() );
            var zoom = map.getBoundsZoom(latlng.layer.getBounds());
            map.setView(latlng, zoom); // access the zoom
        }
        //sourceData : '../../data/_stations.json'
    });

    controlSearch.on('search:locationfound', function(e) {
        if(e.layer._popup)
            e.layer.openPopup();
    }).on('search:collapsed', function(e) {
        featuresLayer.eachLayer(function(layer) {
            featuresLayer.resetStyle(layer);
        });
    });


    map.addControl(controlSearch); // add it to the map

    // Testing: show paths test.
}

function whenDocumentLoaded(action) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", action);
    } else {
        // `DOMContentLoaded` already fired
        action();
    }
}

function getColorForCost(cost, budget) {
    var scale = chroma.scale([COLOR_BEST, COLOR_WORST]).mode('lch').colors(budget);
    return scale[Math.round(cost)];
}

var starting_stop;
var pathsLayer = L.layerGroup();

function showLegend(budget) {
    var scale = chroma.scale([COLOR_WORST, COLOR_BEST]).mode('lch').colors(budget);
    var s = '';
    for (var i = 0; i <= 100; i++) {
        s += '<span class="grad-step" style="background-color:' + scale[Math.round(budget * i / 100)] + '"></span>';
    }
    s += '<span class="domain-min">€' + 0 + '</span>';
    s += '<span class="domain-max">€' + budget + '</span>';
    document.getElementById("legend").innerHTML = s;
}

function showPathsFromStop(stop_name) {
    pathsLayer.clearLayers();
    if (typeof stop_name === "undefined")
        stop_name = starting_stop
    starting_stop = stop_name;
    var budget = document.getElementById("budget").value;
    showLegend(budget);
    var url = new URL(`${API_URL}/get_routes_from_source`)
    var params = {source_name: stop_name, budget: budget}
    url.search = new URLSearchParams(params)
    console.log(url);
    fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        var start_point = new L.LatLng(resp.start_lat, resp.start_lon);
        L.marker([resp.start_lat, resp.start_lon], {
            radius: map.getZoom(),
            color: 'green',
            fillColor: 'green',
            fillOpacity: 1
        }).addTo(pathsLayer);
        for (let dest of resp.paths) {
            var pointList = [start_point];
            // var dest_name;
            var tooltip_text = starting_stop + ', ';
            for (let path_part of dest.segments) {
                // var start_name = path_part[0];
                var end_name = path_part[1];
                tooltip_text += end_name + ', ';
                // dest_name = end_name;
                // var dep_time = path_part[3];
                // var arr_time = path_part[4];
                var end_lat = path_part[5];
                var end_lon = path_part[6];
                var point = new L.LatLng(end_lat, end_lon);
                pointList.push(point);
            }
            var polyline = new L.Polyline(pointList, {
                color: getColorForCost(dest.cost, budget),
                weight: 4,
            });
            polyline.addTo(pathsLayer);
            tooltip_text += '€' + dest.cost.toFixed(1);
            polyline.bindTooltip(tooltip_text);
            polyline.on('mouseover', function(e) {
                this.setStyle({weight: 10});
                // this._popup.setContent(total_cost);
                // this._popup.openOn(this._map);
            });
            polyline.on('mouseout', function() {
                this.setStyle({weight: 4});
            });
        }
        pathsLayer.addTo(map);
    });
}

function setupPage() {
    $('#budget').on('input change', () => {
        var budget = document.getElementById('budget').value;
        document.getElementById('budgetValue').innerHTML = '€' + budget;
    });
}

whenDocumentLoaded(() => {
    setupMap();
    setupPage();
});
