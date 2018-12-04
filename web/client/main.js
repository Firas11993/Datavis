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

async function onStationClick(station, e) {
    var popup = e.getPopup();
    var url = new URL('http://127.0.0.1:5000/get_station_info/' + station.Name);
    
    
    var template = () => `<h1>${station.Name}</h1>${content}`;
    var content = ` <b>(Commune: ${station.Commune})<b>`;
    var wikiurl = "https://en.wikipedia.org/api/rest_v1/page/summary/";
    

  

    await fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        if ('historic_cities' in resp) {
            content += '<h2>Historic cities:</h2><ul>';
            
            for (let city of resp.historic_cities){
                content += '<li>' + city + '</li>';  
                wikiurl += city; 
            }
            content += '</ul>';

        }
        if ('art_history_cities' in resp) {
            content += '<h2>Art/History cities:</h2><ul>';
            for (let city of resp.art_history_cities){
                content += '<li>' + city + '</li>';
                if(wikiurl == "https://en.wikipedia.org/api/rest_v1/page/summary/"){
                    wikiurl += city;
                }
            }
            content += '</ul>';
        }
        popup.setContent(template());
        popup.update();
    });
    
    await fetch(new URL(wikiurl)).then(async function(response) {

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

function setupMap() {
    var map = L.map('map').setView([46, 2], 6);
    L.tileLayer('https://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.outdoors',
        accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
    }).addTo(map);

    var mapMarkers = L.layerGroup().addTo(map);
    var showBounds = debounce(function() {
        var bounds = map.getBounds()
        var url = new URL('http://127.0.0.1:5000/get_stations')
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
}

function whenDocumentLoaded(action) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", action);
    } else {
        // `DOMContentLoaded` already fired
        action();
    }
}

whenDocumentLoaded(() => {
    setupMap();
});
