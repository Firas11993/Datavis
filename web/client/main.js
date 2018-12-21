const API_URL = 'http://127.0.0.1:5000'
const COLOR_BEST = 'green';
const COLOR_WORST = 'red';

var polylines = new Map();
var destDivs = new Map();
var modal;

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

var focused_stop;
function showModal(city) {
    modal.classList.remove('hidden');
    document.getElementById('modal-header').innerHTML = city;
    document.getElementById('modal-body').innerHTML = `<p>${city}</p>`;
}
function onStationClick(station) {
    focused_stop = station.Name;
    document.getElementById('sidebarWelcomeText').classList.add('hidden');
    document.getElementById('sidebarContent').classList.remove('hidden');
    document.getElementById('sidebarHeader').innerHTML = station.Name;
    sidebar.open('home');
    var url = new URL(`${API_URL}/get_station_info/${station.Name}`)
    var wikiurl = "https://en.wikipedia.org/api/rest_v1/page/summary/";
    fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        if (resp.important) {
            document.getElementById('normalStopInfo').classList.add('hidden');
            document.getElementById('interestingStopInfo').classList.remove('hidden');
            var content = document.createElement('div');
            for (let [city, tags] of Object.entries(resp.cities)) {
                var wrapper = document.createElement('div');
                var li_content = `<li class="intloc">${city} <span>`;
                li_content += tags.map(item => `<span class="tag ${item}">${item == 'ArtH' ? 'City of arts & history' : 'Historic monuments' }</span>`).join('');
                li_content += '</span></li>';
                wrapper.innerHTML = li_content;
                var li = wrapper.firstChild;
                li.addEventListener('click', () => { showModal(city); });
                content.appendChild(li);
                if (wikiurl.endsWith('/'))
                    wikiurl += city;
            }
            document.getElementById('intlocslist').innerHTML = '';
            document.getElementById('intlocslist').appendChild(content);
        } else {
            document.getElementById('normalStopInfo').classList.remove('hidden');
            document.getElementById('interestingStopInfo').classList.add('hidden');
        }
    });
    /*
        .then(function(){
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
    */
}

// Source: <https://stackoverflow.com/a/321527/1460652>
function partial(func /*, 0..n args */) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
        var allArguments = args.concat(Array.prototype.slice.call(arguments));
        return func.apply(this, allArguments);
    };
}

var map;
var sidebar;
var rightSidebar;

function setupMap() {
    var lat = 46.566414;
    var lng =  2.4609375;
    var zoom =  6;

    map = new L.Map('map', {minZoom: 6, maxZoom: 11, zoomControl: false, attributionControl: false});
    new L.Control.Zoom({position: 'bottomright'}).addTo(map);
    var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var osm = new L.TileLayer(osmUrl, {minZoom: 6, maxZoom: 8});
    map.addLayer(osm);

    sidebar = L.control.sidebar({
        container: 'sidebar',
        position: 'left',
        autopan: false,       // whether to maintain the centered map point when opening the sidebar
        closeButton: true,    // whether t add a close button to the panes
    }).addTo(map);
    sidebar.open('home');

    rightSidebar = L.control.sidebar({
        container: 'rightSidebar',
        position: 'right',
    }).addTo(map);

    map.setView(new L.LatLng(lat, lng), zoom);

    L.geoJson(france_shape, {
        clickable: false,
        invert: true,
        style: { fillColor: '#000', fillOpacity: 0.2, weight: 0 },
    }).addTo(map);

    L.tileLayer('https://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
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
    return scale[Math.floor(cost)];
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
    document.getElementById('destsList').innerHTML = '';
    pathsLayer.clearLayers();
    if (typeof stop_name === "undefined")
        stop_name = starting_stop
    starting_stop = stop_name;
    var budget = document.getElementById("budget").value;
    showLegend(budget);
    var url = new URL(`${API_URL}/get_routes_from_source`)
    var params = {source_name: stop_name, budget: budget}
    url.search = new URLSearchParams(params)
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
        polylines.clear();
        destDivs.clear();
        for (let dest of resp.paths) {
            var pointList = [start_point];
            var dest_name;
            var stopsList = [];
            for (let path_part of dest.segments) {
                // var start_name = path_part[0];
                var end_name = path_part[1];
                dest_name = end_name;
                var part_cost = path_part[2];
                var part_duration = path_part[3];
                var end_lat = path_part[4];
                var end_lon = path_part[5];
                stopsList.push({
                    cost: part_cost,
                    duration: part_duration,
                    name: end_name
                });
                var point = new L.LatLng(end_lat, end_lon);
                pointList.push(point);
            }
            addToDestsList(starting_stop, stopsList, dest_name, dest.cost, dest.duration, budget);
            var polyline = new L.Polyline(pointList, {
                color: getColorForCost(dest.cost, budget),
                weight: 4,
            });
            polyline.addTo(pathsLayer);
            var tooltip_text = `${starting_stop} to ${dest_name} (€${dest.cost.toFixed(1)})`;
            var polylineID = `${starting_stop}${dest_name}`;
            polyline.bindTooltip(tooltip_text);
            polyline.on('mouseover', function(e) {
                this.setStyle({weight: 10});
                // this._popup.setContent(total_cost);
                // this._popup.openOn(this._map);
            });
            polyline.on('mouseout', function() {
                this.setStyle({weight: 4});
            });
            polyline.on('click', ((id) => {
                return () => {
                    rightSidebar.open('rightHome');
                    var div = destDivs.get(id)
                    M.Collapsible.getInstance(div).open()
                    setTimeout(() => {
                        div.scrollIntoView(true);
                    }, 200);
                }
            })(polylineID));
            polylines.set(polylineID, polyline);
        }
        pathsLayer.addTo(map);
        reverseDestsList();
        document.getElementById('destsNum').innerHTML = `${destDivs.size} destinations`;
        document.getElementById('destsInfo').classList.remove('hidden');
        document.getElementById('destsWelcome').classList.add('hidden');
        refreshCollapsible();
    });
}

function getHumanReadableTime(mins) {
    var hours = Math.floor(mins / 60);
    var minutes = mins - (hours * 60);
    var duration;
    if (hours > 0) {
        duration = `${hours}h ${minutes}m`;
    } else {
        duration = `${minutes} min`;
    }
    return duration;
}

async function refreshCollapsible() {
    $('.collapsible').collapsible();
}

function reverseDestsList() {
    var element = document.getElementById('destsList');
    var children = element.childNodes;
    for(var i = children.length - 1; i >= 0; i--) {
        var child = element.removeChild(children[i]);
        element.appendChild(child);
    }
}

function getStopsDetailsHTML(name, duration, cost, cumCost, budget) {
    var item = document.createElement('li');
    item.innerHTML = name;
    var stop_duration = getHumanReadableTime(duration);
    item.setAttribute('customData', `${stop_duration}\r\n€${cost}`);
    var color = getColorForCost(cumCost, budget);
    item.style.color = color;
    return item.outerHTML;
}

function addToDestsList(start_name, stopsList, dest_name, dest_cost, dest_duration, budget) {
    var stopsNames = '';
    var cumCost = 0;
    stopsNames += getStopsDetailsHTML(start_name, 0, 0, cumCost, budget);
    for (let stop of stopsList) {
        cumCost += stop.cost;
        stopsNames += getStopsDetailsHTML(stop.name, stop.duration, stop.cost, cumCost, budget);
    }
    var duration = getHumanReadableTime(dest_duration);
    var wrapper = document.createElement('div');
    var price = dest_cost.toFixed(1);
    var polylineID = `${start_name}${dest_name}`;
    var bgColor = getColorForCost(dest_cost, budget);
    wrapper.innerHTML = `<ul id="destsList" class="collapsible popout"><li><div style="background-color:${bgColor}" class="collapsible-header"><div class="destContainer"><i class="material-icons">place</i>${dest_name}<div class="destChild"><div class="destEnd">€${price}</div><div class="destEnd">${duration}</div></div></div></div><div class="collapsible-body destList"><ul>${stopsNames}</ul></div></li></ul>`;
    var div = wrapper.firstChild;
    div.addEventListener('mouseover', () => {
        polylines.get(polylineID).setStyle({weight: 10});
    });
    div.addEventListener('mouseout', () => {
        polylines.get(polylineID).setStyle({weight: 4});
    });
    destDivs.set(polylineID, div);
    document.getElementById('destsList').appendChild(div);
}

function setupPage() {
    loadAutocomplete();
    $('.collapsible').collapsible();
    $('#budget').on('input change', () => {
        var budget = document.getElementById('budget').value;
        document.getElementById('budgetValue').innerHTML = '€' + budget;
    });

    modal = document.getElementById('modal-dialog');
    var modal_close = document.getElementById('modal-close');
    modal_close.addEventListener('click', () => { modal.classList.add('hidden'); });
    window.addEventListener('click', (event) => { if (event.target == modal) modal.classList.add('hidden'); });
}

var stationsNamesList;
function loadAutocomplete() {
    var url = new URL(`${API_URL}/get_stations_names`)
    var startingLoc = document.getElementById('startingLoc');
    var stationsNames = document.getElementById('stationsNames');
    fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        stationsNamesList = resp;
        for (let item of resp) {
            var option = document.createElement('option');
            option.value = item;
            stationsNames.appendChild(option);
        }
        startingLoc.placeholder = "e.g. Paris-Nord";
    });
}

function setStopFromInput() {
    var stop_name = document.getElementById("startingLoc").value;
    if (stationsNamesList.indexOf(stop_name) > -1) {
        starting_stop = stop_name;
        showPathsFromStop();
    } else {
        alert('Unknown stop selected: "' + stop_name + '".\nPlease select a valid stop.');
    }
}

function selectCurrentlyFocusedCity() {
    starting_stop = focused_stop;
    showPathsFromStop();
}

whenDocumentLoaded(() => {
    setupMap();
    setupPage();
});
