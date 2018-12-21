const API_URL = 'http://127.0.0.1:5000'
const COLOR_BEST = 'green';
const COLOR_WORST = 'red';


// Page elements.
let map;
let sidebar;
let rightSidebar;
let modal;

// Map elements.
let pathsLayer; // Stores paths (segments from one stop to another).
let mapMarkers; // Stores markers (stops' circles on the map).
let polylines = new Map(); // Used to highlight polylines from a route's details.
let destDivs = new Map(); // Used to open a route's details from a polyline.
let stopMarkers = new Map(); // Used to keep the currently focused stop styled.

// Used to track the currently selected stop, and for styling it
// appropriately/clearing the styling when switching stops.
let startingStop;
let focusedStopName;
let focusedMarker;
let oldFocusedStyle;
let oldFocusedName;
let oldFocusedLatLng;
let stationsNamesList;

// The first time the user uses the tool, we want the right sidebar to expand
// to let the user know it exists.
let firstStart = true;


// Source: <https://davidwalsh.name/javascript-debounce-function>
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        let context = this, args = arguments;
        let later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        let callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

// Shows the modal dialog for a given city. The following information is shown:
// 1. A summary about the city fetched from Wikipedia, as well as a selected
// photo.
// 2. The list of monuments that can be found in this city.
function showModal(city) {
    // Reset state.
    modal.classList.remove('hidden');
    document.getElementById('modal-title').innerHTML = city;
    document.getElementById('modal-header').scrollIntoView();
    document.getElementById('monuments-list').innerHTML = '';
    document.getElementById('overview').innerHTML = '';
    document.getElementById('overview-image').innerHTML = '';

    // Load monuments list.
    let url = new URL(`${API_URL}/get_monuments/${city}`)
    fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        if (resp.length == 0) {
            document.getElementById('monuments-list-container').classList.add('hidden');
        } else {
            // Show the monuments, including their image.
            document.getElementById('monuments-list-container').classList.remove('hidden');
            let content = '';
            for (let monument of resp) {
                let img = `https://${monument[4]}`;
                content += `<li class="monument-item collection-item card"><div class="card-image"><img src="${img}"><span class="card-title">${monument[0].split(',')[0]}</span></div><div class="card action"><a href="${monument[3]}" target="_blank" class="secondary-content"><i class="fa fa-wikipedia-w">&nbsp;</i></a></div></li>`
            }
            document.getElementById('monuments-list').innerHTML = content;
        }
    });

    // Load Wikipedia summary.
    let wikiurl = `https://en.wikipedia.org/api/rest_v1/page/summary/${city}`;
    fetch(wikiurl).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        // Display image.
        if ('originalimage' in resp)
            document.getElementById('overview-image').src = resp.originalimage.source;
        // Display summary.
        if ('extract' in resp) {
            content = '';
            for (let descr of resp.extract)
                content +=  descr;
        }
        document.getElementById('overview').innerHTML = content;
    });
}

// When a station is clicked on the map, opens the sidebar with the following
// elements:
// 1. A button to set this stop as the starting location.
// 2. If this is an important stop (i.e. a stop connected to important cities),
// then list nearby important cities.
// 3. If not, then show a general informative message instead.
function onStationClick(stationName) {
    focusedStopName = stationName;
    // Reset state.
    document.getElementById('sidebar-welcome-text').classList.add('hidden');
    document.getElementById('sidebar-content').classList.remove('hidden');
    document.getElementById('sidebar-header').innerHTML = stationName;
    sidebar.open('home');
    // Fetch station info.
    let url = new URL(`${API_URL}/get_station_info/${stationName}`)
    fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        // It's an important stop. We want to show the list of nearby important
        // cities.
        if (resp.important) {
            document.getElementById('normal-stop-info').classList.add('hidden');
            document.getElementById('interesting-stop-info').classList.remove('hidden');
            let content = document.createElement('div');
            // For each important city, we show its named as well as its tags
            // ("City of arts & history" or "Historic monuments").
            for (let [city, tags] of Object.entries(resp.cities)) {
                let wrapper = document.createElement('div');
                let liContent = `<li class="intloc">${city} <span>`;
                liContent += tags.map(item => `<span class="tag ${item}">${item == 'ArtH' ? 'City of arts & history' : 'Historic monuments' }</span>`).join('');
                liContent += '</span></li>';
                wrapper.innerHTML = liContent;
                let li = wrapper.firstChild;
                // Clicking a city's name should show more info about it.
                li.addEventListener('click', () => { showModal(city); });
                content.appendChild(li);
            }
            document.getElementById('intlocslist').innerHTML = '';
            document.getElementById('intlocslist').appendChild(content);
        } else {
            // It's not an important stop. Just show the general message.
            document.getElementById('normal-stop-info').classList.remove('hidden');
            document.getElementById('interesting-stop-info').classList.add('hidden');
        }
    });
}

// Source: <https://stackoverflow.com/a/321527/1460652>
// Useful for anonymous functions when we want the variables to be resolved
// directly.
function partial(func /*, 0..n args */) {
    let args = Array.prototype.slice.call(arguments, 1);
    return function() {
        let allArguments = args.concat(Array.prototype.slice.call(arguments));
        return func.apply(this, allArguments);
    };
}

// Queues up actions until the document's loaded.
function onDocumentLoad(action) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", action);
    } else {
        // `DOMContentLoaded` already fired
        action();
    }
}

// Given a cost and a budget, returns an appropriate color representing it.
function getColorForCost(cost, budget) {
    let scale = chroma.scale([COLOR_BEST, COLOR_WORST]).mode('lch').colors(budget);
    return scale[Math.floor(cost)];
}

// Shows a legend based on the budget.
function showLegend(budget) {
    let scale = chroma.scale([COLOR_WORST, COLOR_BEST]).mode('lch').colors(budget);
    let s = '';
    for (let i = 0; i <= 100; i++) {
        s += '<span class="grad-step" style="background-color:' + scale[Math.round(budget * i / 100)] + '"></span>';
    }
    s += '<span class="domain-min">€' + 0 + '</span>';
    s += '<span class="domain-max">€' + budget + '</span>';
    document.getElementById("legend").innerHTML = s;
}

// Highlights the currently focused stop (CircleMarker). This is called
// whenever there is a change in the map and the stops are reloaded.
function highlightFocusedMarker() {
    if (typeof focusedMarker === "undefined") return;
    let marker = stopMarkers.get(focusedMarker);
    // If the selected stop is a small one, it won't be sent by the server when
    // the user zooms back out. In those cases, we want to draw the marker
    // anyway because the user has selected it.
    if (typeof marker === "undefined") {
        let stopMarker = L.circleMarker(oldFocusedLatLng, oldFocusedStyle);
        stopMarkers.set(focusedMarker, stopMarker);
        stopMarker.bindTooltip(focusedMarker);
        stopMarker.on('mouseover', function(e) {
            this.setStyle({radius: this._radius * 1.5});
        });
        stopMarker.on('mouseout', function() {
            this.setStyle({radius: this._radius / 1.5});
        });
        stopMarker.on('click', partial(onStationClick, stopMarker));
        stopMarker.addTo(mapMarkers);
        stopMarker.setStyle({
            radius: map.getZoom() * 1.5,
            color: COLOR_BEST,
            fillColor: COLOR_BEST,
            fillOpacity: 1
        });
    } else {
        // The marker's already shown, we just need to style it appropriately.
        marker.setStyle({
            radius: map.getZoom() * 1.5,
            color: COLOR_BEST,
            fillColor: COLOR_BEST,
            fillOpacity: 1
        });
    }
}

// Saves the currently focused stop and clears the old one.
function setFocusedMarker(name) {
    // Restore the previously focused stop's style.
    let marker = stopMarkers.get(oldFocusedName);
    if (typeof marker !== "undefined") {
        marker.setStyle(oldFocusedStyle);
    }
    // Save the soon-to-be-focused stop's style. It'll come in handy when we
    // want to reset it eventually.
    focusedMarker = name;
    marker = stopMarkers.get(name);
    if (typeof marker !== "undefined") {
        oldFocusedStyle = {
            color: marker.options.color,
            fillColor: marker.options.fillColor,
            fillOpacity: marker.options.fillOpacity,
            radius: marker.options.radius
        };
        oldFocusedLatLng = marker._latlng;
    }
    oldFocusedName = name;
    // Set the newly focused style.
    highlightFocusedMarker();
}

// Refreshes collapsible items in the right sidebar (list of destinations).
async function refreshCollapsible() {
    $('.collapsible').collapsible();
}

// Reverses the order of the list of destinations, so that they're shown from
// cheapest to most expensive.
async function reverseDestsList() {
    let element = document.getElementById('destsList');
    let children = element.childNodes;
    for(let i = children.length - 1; i >= 0; i--) {
        let child = element.removeChild(children[i]);
        element.appendChild(child);
    }
}

// Returns a human readable time, given the number of minutes.
// e.g. "132" returns "2h 12m"
function getHumanReadableTime(mins) {
    let hours = Math.floor(mins / 60);
    let minutes = mins - (hours * 60);
    let duration;
    if (hours > 0) {
        duration = `${hours}h ${minutes}m`;
    } else {
        duration = `${minutes} min`;
    }
    return duration;
}

// For a given stop, generates and returns the stop details collapsible item.
function getStopsDetailsHTML(name, duration, cost, cumulCost, budget) {
    let item = document.createElement('li');
    item.innerHTML = name;
    let stopDuration = getHumanReadableTime(duration);
    item.setAttribute('customData', `${stopDuration}\r\n€${cost}`);
    let color = getColorForCost(cumulCost, budget);
    item.style.color = color;
    return item.outerHTML;
}

// Creates and adds a destination's detailed info to the right sidebar.
function addToDestsList(startName, stopsList, destName, destCost, destDuration, budget) {
    let stopsNames = '';
    let cumulCost = 0;
    stopsNames += getStopsDetailsHTML(startName, 0, 0, cumulCost, budget);
    for (let stop of stopsList) {
        cumulCost += stop.cost;
        stopsNames += getStopsDetailsHTML(stop.name, stop.duration, stop.cost, cumulCost, budget);
    }
    let duration = getHumanReadableTime(destDuration);
    let wrapper = document.createElement('div');
    let price = destCost.toFixed(1);
    let polylineID = `${startName}${destName}`;
    let bgColor = getColorForCost(destCost, budget);
    wrapper.innerHTML = `<ul id="destsList" class="collapsible popout"><li><div style="background-color:${bgColor}" class="collapsible-header"><div class="dest-container"><i class="material-icons">place</i>${destName}<div class="dest-child"><div class="dest-end">€${price}</div><div class="dest-end">${duration}</div></div></div></div><div class="collapsible-body dest-list"><ul>${stopsNames}</ul></div></li></ul>`;
    let div = wrapper.firstChild;
    div.addEventListener('mouseover', () => {
        polylines.get(polylineID).setStyle({weight: 10});
    });
    div.addEventListener('mouseout', () => {
        polylines.get(polylineID).setStyle({weight: 4});
    });
    div.addEventListener('click', () => {
        onStationClick(destName);
    });
    destDivs.set(polylineID, div);
    document.getElementById('destsList').appendChild(div);
}

// Shows a single path on the map (given a start point, a budget and a
// destination object, which contains all the intermediate segments).
async function showSinglePath(startPoint, dest, budget) {
    let pointList = [startPoint];
    let destName;
    let stopsList = [];
    // Add all the coordinates (one point per stop) to a list.
    for (let pathPart of dest.segments) {
        let endName = pathPart[1];
        destName = endName;
        let partCost = pathPart[2];
        let partDuration = pathPart[3];
        let endLat = pathPart[4];
        let endLon = pathPart[5];
        stopsList.push({
            cost: partCost,
            duration: partDuration,
            name: endName
        });
        let point = new L.LatLng(endLat, endLon);
        pointList.push(point);
    }
    // Add the destination's detailed info to the right sidebar.
    addToDestsList(startingStop, stopsList, destName, dest.cost, dest.duration, budget);
    // Build a polyline from the list of points and add it to the map.
    let polyline = new L.Polyline(pointList, {
        color: getColorForCost(dest.cost, budget),
        weight: 4,
        snakingSpeed: 100
    });
    polyline.addTo(pathsLayer).snakeIn();
    // Tooltip & mouseover/click handling:
    // 1. On mouseover, we want the polyline to become thicker.
    // 2. On click, we want to open the destination's details view in the right
    // sidebar.
    let tooltipText = `${startingStop} to ${destName} (€${dest.cost.toFixed(1)})`;
    let polylineID = `${startingStop}${destName}`;
    polyline.bindTooltip(tooltipText);
    polyline.on('mouseover', function(e) {
        this.setStyle({weight: 10});
    });
    polyline.on('mouseout', function() {
        this.setStyle({weight: 4});
    });
    polyline.on('click', ((id) => {
        return () => {
            rightSidebar.open('rightHome');
            let div = destDivs.get(id)
            M.Collapsible.getInstance(div).open()
            // Slight delay so that the scrolling happens correctly (it would
            // scroll before the animation completes otherwise, resulting in a
            // weird scroll position).
            setTimeout(() => {
                div.scrollIntoView(true);
            }, 200);
        }
    })(polylineID));
    polylines.set(polylineID, polyline);
}

// Shows all the paths that go out from a stop.
function showPathsFromStop(stopName) {
    document.getElementById('destsList').innerHTML = '';
    pathsLayer.clearLayers();
    // If no stop is explicitely given, then use the one set last by the user
    // (usually via the "Starting location" input field).
    if (typeof stopName === "undefined")
        stopName = startingStop
    startingStop = stopName;
    let budget = document.getElementById("budget").value;
    let url = new URL(`${API_URL}/get_routes_from_source`)
    let params = {source_name: stopName, budget: budget}
    url.search = new URLSearchParams(params)
    document.getElementById('loader-container').classList.add('visible');
    fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        showLegend(budget);
        let startPoint = new L.LatLng(resp.start_lat, resp.start_lon);
        setFocusedMarker(startingStop);
        polylines.clear();
        destDivs.clear();
        document.getElementById('loader-container').classList.remove('visible');
        // Show all the paths, one by one.
        for (let dest of resp.paths)
            showSinglePath(startPoint, dest, budget);
        if (resp.paths.length == 0) {
            alert(`Sorry, we couldn't find any destinations within your budget. You need at least €${resp.min_cost} to reach interesting destinations.`);
        } else {
            reverseDestsList();
            // First time? Open the right sidebar to let the user know it
            // exists.
            if (firstStart) {
                firstStart = false;
                rightSidebar.open('rightHome');
            }
        }
        document.getElementById('destsNum').innerHTML = `${destDivs.size} destinations`;
        document.getElementById('destsSource').innerHTML = `Starting location: ${startingStop}`;
        document.getElementById('destsLoaded').classList.remove('hidden');
        document.getElementById('destsWelcome').classList.add('hidden');
        refreshCollapsible();
    });
}

// Sets the current stop based on the user's input ("Starting location" input
// field).
function setStopFromInput() {
    let stopName = document.getElementById('starting-loc').value;
    if (stationsNamesList.indexOf(stopName) > -1) {
        startingStop = stopName;
        showPathsFromStop();
    } else {
        alert('Unknown stop selected: "' + stopName + '".\nPlease select a valid stop.');
    }
}

// Sets the stop whose info is currently present in the left sidebar to be the
// focused stop.
function selectCurrentlyFocusedStop() {
    startingStop = focusedStopName;
    showPathsFromStop();
}

// Fetches and shows all the stops that are visible inside of the current
// bounds.
// There's a slightly debounce delay to avoid spam calls when zooming in with
// the scroll wheel, for example.
const showBounds = debounce(function() {
    let bounds = map.getBounds()
    let url = new URL(`${API_URL}/get_stations`)
    let params = {east: bounds.getEast(), west: bounds.getWest(), north: bounds.getNorth(), south: bounds.getSouth(), zoom: map.getZoom()}
    url.search = new URLSearchParams(params)
    fetch(url).then(function(response) {
        return response.json();
    }).then(function(stations) {
        mapMarkers.clearLayers()
        stopMarkers.clear();
        for (let [id, station] of Object.entries(stations)) {
            importantStop = station.Imp;
            // We want importannt stops to be shown more prominently than the
            // rest.
            let unimpRadius = map.getZoom();
            let impRadius = map.getZoom();
            if (map.getZoom() < 9) {
                unimpRadius *= .2;
                impRadius *= .8;
            } else if (map.getZoom() < 10) {
                unimpRadius *= .4;
                impRadius *= 1.2;
            } else {
                unimpRadius *= .7;
                impRadius *= 1.4;
            }
            let stopMarker = L.circleMarker([station.Latitude, station.Longitude], {
                radius: importantStop && impRadius || unimpRadius,
                color: importantStop && '#3498db' || '#95a5a6',
                fillColor: importantStop && '#3498db' || '#95a5a6',
                fillOpacity: 0.2
            });
            stopMarkers.set(station.Name, stopMarker);
            // Make it more usable: on hover, show the name and make the circle
            // slightly bigger.
            stopMarker.bindTooltip(station.Name);
            stopMarker.on('mouseover', function(e) {
                this.setStyle({radius: this._radius * 1.5});
            });
            stopMarker.on('mouseout', function() {
                this.setStyle({radius: this._radius / 1.5});
            });
            stopMarker.on('click', partial(onStationClick, station.Name));
            stopMarker.addTo(mapMarkers);
        }
        highlightFocusedMarker();
    });
}, 125);

// Sets up the map and sidebars.
function setupMap() {
    // We're showing the attribution via HTML, to avoid issues with it jumping around due to the sidebars.
    map = new L.Map('map', {minZoom: 6, maxZoom: 11, zoomControl: false, attributionControl: false});
    new L.Control.Zoom({position: 'bottomright'}).addTo(map);
    // Add the map tiles.
    L.tileLayer('https://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        maxZoom: 18,
        id: 'mapbox.outdoors',
        accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
    }).addTo(map);
    // Map initial view.
    let lat = 46.8;
    let lng =  0.7;
    let zoom =  6;
    map.setView(new L.LatLng(lat, lng), zoom);

    // Darken everything outside of France, so that France is in focus.
    L.geoJson(franceShape, {
        clickable: false,
        invert: true,
        style: { fillColor: '#000', fillOpacity: 0.2, weight: 0 },
    }).addTo(map);

    mapMarkers = L.layerGroup().addTo(map);
    pathsLayer = L.layerGroup().addTo(map);
    // Update stations when moving the map.
    map.on('moveend', () => { showBounds(); });
    showBounds()

    // Add sidebars.
    sidebar = L.control.sidebar({
        container: 'sidebar',
        position: 'left',
        autopan: false
    }).addTo(map);
    sidebar.open('home');

    rightSidebar = L.control.sidebar({
        container: 'rightSidebar',
        position: 'right',
    }).addTo(map);

    // Hide sidebar contents when they're closed to avoid clipping issue.
    sidebar.on('closing', () => { setTimeout(() => { document.getElementById('sidebar-inner').classList.add('hidden'); }, 400) });
    sidebar.on('opening', () => { document.getElementById('sidebar-inner').classList.remove('hidden'); });
    rightSidebar.on('closing', () => { setTimeout(() => { document.getElementById('right-sidebar-inner').classList.add('hidden'); }, 400) });
    rightSidebar.on('opening', () => { document.getElementById('right-sidebar-inner').classList.remove('hidden'); });
}

// Loads the autocompletion for the stations' names ("Starting location" input
// field).
function loadAutoCompletion() {
    let url = new URL(`${API_URL}/get_stations_names`)
    let startingLoc = document.getElementById('starting-loc');
    let stationsNames = document.getElementById('stations-names');
    fetch(url).then(async function(response) {
        return response.json();
    }).then(function(resp) {
        stationsNamesList = resp;
        for (let item of resp) {
            let option = document.createElement('option');
            option.value = item;
            stationsNames.appendChild(option);
        }
        startingLoc.placeholder = "e.g. Paris-Nord";
    });
}

// Sets page up: autocompletion, budget update and modal dialog glue.
function setupPage() {
    loadAutoCompletion();
    $('#budget').on('input change', () => {
        let budget = document.getElementById('budget').value;
        document.getElementById('budget-value').innerHTML = '€' + budget;
    });

    modal = document.getElementById('modal-dialog');
    let modalClose = document.getElementById('modal-close');
    modalClose.addEventListener('click', () => { modal.classList.add('hidden'); });
    window.addEventListener('click', (event) => { if (event.target == modal) modal.classList.add('hidden'); });
}


// Are we ready yet? Let's go!
onDocumentLoad(() => {
    setupMap();
    setupPage();
});
