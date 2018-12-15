const API_URL = 'http://127.0.0.1:5000'

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

function onStationClick(station, e) {
    var popup = e.getPopup();
    var url = new URL(`${API_URL}/get_station_info/${station.Name}`)
    var template = () => `<h1>${station.Name}</h1>${content}`;
    var content = ` <b>(Commune: ${station.Commune})<b>`;
    var wikiurl = "https://en.wikipedia.org/api/rest_v1/page/summary/";

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

        popup.setContent(template());
        popup.update();
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
            popup.setContent(template());
            popup.update();

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
function setupMap() {
    var lat = 46.566414;
    var lng =  2.4609375;
    var zoom =  6;

    map = new L.Map('map');
    var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var osmAttrib='Map data &copy; OpenStreetMap contributors';
    var osm = new L.TileLayer(osmUrl, {minZoom: 3, maxZoom: 8, attribution: osmAttrib});
    map.addLayer(osm);

    map.setView(new L.LatLng(lat, lng), zoom);

    L.geoJson(france_shape, {
        clickable: false,
        invert: true,
        style: { fillColor: '#000', fillOpacity: 0.2 },
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
        var params = {east: bounds.getEast(), west: bounds.getWest(), north: bounds.getNorth(), south: bounds.getSouth()}
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
                }).addTo(mapMarkers).bindPopup(partial(onStationClick, station));
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
            opacity: .5,
            fillOpacity: 0,
        }
    });

    map.addLayer(featuresLayer);

    // add the search bar to the map
    var controlSearch = new L.Control.Search({
        position:'topleft',    // where do you want the search bar?
        layer: featuresLayer,
        propertyName: 'nom',
        initial: false,
        marker: false,
        textPlaceholder: 'Departure departement ', // placeholder while nothing is searched
        collapsed : false,
        moveToLocation: function(latlng, title, map) {
            //map.fitBounds( latlng.layer.getBounds() );
            var zoom = map.getBoundsZoom(latlng.layer.getBounds());
            map.setView(latlng, zoom); // access the zoom
        }
        //sourceData : '../../data/_stations.json'
    });

    controlSearch.on('search:locationfound', function(e) {

        console.log('search:locationfound', );

        //map.removeLayer(this._markerSearch)

        e.layer.setStyle({opacity: 1});
        if(e.layer._popup)
            e.layer.openPopup();

    }).on('search:collapsed', function(e) {

        featuresLayer.eachLayer(function(layer) {	//restore feature color
            featuresLayer.resetStyle(layer);
        });
    });


    map.addControl(controlSearch); // add it to the map

    // create the control
    var command = L.control({position: 'topleft'});

    command.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'command');

        div.innerHTML = '<form id="price">Price<input id="my-custom-control" type="number" value="0" min="0"/></form>';
        return div;
    };

    command.addTo(map);

    var command = L.control({position: 'topleft'});

    command.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'command');

        div.innerHTML = '<button id="search" onclick="loadTest(map)">Search</button>'
        return div;
    };

    command.addTo(map);

    // Testing: show paths test.
  //  loadTest(map);
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
    var scale = chroma.scale(['lightgreen', 'green','yellow','orange','red','black']).colors(budget);
    return scale[cost];
}

// clear polylines
function clearPolylines(polylines) {
  for (i=0;i<polylines.length;i++){
      map.removeLayer(polylines[i]);
    //  console.log("polyline dropped ...")
  }
}

var polylines=[] ;

function loadTest(map) {
    if (polylines.length != 0){
        console.log("processing polylines dropping")
        clearPolylines(polylines);
    }
    var url = new URL(`${API_URL}/get_routes_from_source/Abancourt`)
    fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        var start_point = new L.LatLng(resp.start_lat, resp.start_lon);
        L.circleMarker([resp.start_lat, resp.start_lon], {
            radius: map.getZoom(),
            color: 'green',
            fillColor: 'green',
            fillOpacity: 1
        }).addTo(map);
        for (let dest of resp.paths) {
            var pointList = [start_point];
            var dest_name;
            var tooltip_text = 'Abancourt, ';
            for (let path_part of dest.segments) {
                var start_name = path_part[0];
                var end_name = path_part[1];
                tooltip_text += end_name + ', ';
                dest_name = end_name;
                var cost = path_part[2];
                var dep_time = path_part[3];
                var arr_time = path_part[4];
                var end_lat = path_part[5];
                var end_lon = path_part[6];
                var point = new L.LatLng(end_lat, end_lon);
                pointList.push(point);
            }
            var budget = document.getElementById("my-custom-control").value;
            if (dest.cost <= budget) {
                var polyline = new L.Polyline(pointList, {
                    color: getColorForCost(dest.cost, budget),
                    weight: 4,
                });
                polyline.addTo(map);
                tooltip_text += '€' + dest.cost;
                polyline.bindTooltip(tooltip_text);
                polyline.on('mouseover', function(e) {
                    this.setStyle({weight: 10});
                    // this._popup.setContent(total_cost);
                    // this._popup.openOn(this._map);
                });
                polyline.on('mouseout', function() {
                    this.setStyle({weight: 4});
                });
                polylines.push(polyline);
            //    console.log(polylines);

            }
        }
    });
}

whenDocumentLoaded(() => {
    setupMap();
});
