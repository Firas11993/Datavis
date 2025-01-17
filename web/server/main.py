import json
import pickle


import pandas as pd
from flask import Flask, request


# Load all required data.
DATA_DIR = '../../preprocessing/data/'
TAG_HIST = 'Hist'
TAG_ARTHIST = 'ArtH'
print('Loading data...')
STATIONS = pd.read_csv(DATA_DIR + '_stations.csv').dropna()
MONUMENTS = pd.read_csv(DATA_DIR + '_monuments.csv')
with open(DATA_DIR + '_historic_cities.json') as infile:
    HISTORIC_CITIES = json.load(infile)
with open(DATA_DIR + '_art_history_cities.json') as infile:
    ART_HISTORY_CITIES = json.load(infile)
SPECIAL_CITIES = list(HISTORIC_CITIES.keys())
SPECIAL_CITIES.extend([item for item in SPECIAL_CITIES for SPECIAL_CITIES
                       in ART_HISTORY_CITIES.values()])
with open(DATA_DIR + '_routing_stops_id_by_name.json') as infile:
    STOPS_ID_BY_NAME = json.load(infile)
with open(DATA_DIR + '_routing_stops_name_by_id.json') as infile:
    STOPS_NAME_BY_ID = json.load(infile)
with open(DATA_DIR + '_routing_paths.pkl', 'rb') as f:
    PATHS = pickle.load(f)
with open(DATA_DIR + '_routing_graph.pkl', 'rb') as f:
    GRAPH = pickle.load(f)
SPECIAL_STOPS_DF = pd.DataFrame.from_dict(STOPS_NAME_BY_ID, orient='index',
                                          columns=['name'])
SPECIAL_STOPS_DF = SPECIAL_STOPS_DF[SPECIAL_STOPS_DF.name.isin(SPECIAL_CITIES)]
print('Ready!')


app = Flask(__name__)


@app.route('/get_stations_names', methods=['GET'])
def get_stations_names():
    '''Return all the names of the stations.'''
    names = STATIONS.Name.tolist()
    return json.dumps(sorted(names))

@app.route('/get_stations', methods=['GET'])
def get_stations():
    '''Return visible station, or just the important ones when zoomed out.

    Parameters:
        - east (float): the eastern map boundary.
        - west (float): the western map boundary.
        - north (float): the northern map boundary.
        - south (float): the southern map boundary.
        - zoom (int): the current zoom level.
    '''
    east = float(request.args.get('east'))
    west = float(request.args.get('west'))
    north = float(request.args.get('north'))
    south = float(request.args.get('south'))
    zoom = int(request.args.get('zoom'))
    # Load and filter visible stations.
    df = STATIONS
    df_imp = df[(df.Name.isin(HISTORIC_CITIES.keys()))
                | (df.Name.isin(ART_HISTORY_CITIES.keys()))]
    # If we're zoomed out, only return important stations.
    if zoom < 8:
        df = df_imp
    else:
        df = df[(df.Longitude > west) & (df.Longitude < east)
                & (df.Latitude > south) & (df.Latitude < north)]
    df['Imp'] = df.index.isin(df_imp.index)
    return df.to_json(orient='index')

@app.route('/get_station_info/<name>', methods=['GET'])
def get_station_info(name):
    '''Return info for a station about nearby important cities.'''
    info = {'cities': {}}
    if name in HISTORIC_CITIES:
        for city in HISTORIC_CITIES[name]:
            info['cities'][city] = [TAG_HIST]
    if name in ART_HISTORY_CITIES:
        for city in ART_HISTORY_CITIES[name]:
            info['cities'][city] = ([*info['cities'][city], TAG_ARTHIST]
                                    if city in info['cities']
                                    else [TAG_ARTHIST])
    info['important'] = len(info['cities']) > 0
    return json.dumps(info)

@app.route('/get_routes_from_source/', methods=['GET'])
def get_routes_from_source():
    '''Get and return all the routes from a given source (within budget).

    Arguments:
        - source_name (str): the name of the starting station.
        - budget (int): the maximal cost.
    '''
    source_name = request.args.get('source_name')
    budget = int(request.args.get('budget'))
    source_id = STOPS_ID_BY_NAME[source_name]
    result = []
    source_station = STATIONS[STATIONS.Name == source_name].iloc[0]
    min_cost = 999999
    # Go over all potential destinations.
    for dest_id, _ in SPECIAL_STOPS_DF.iterrows():
        dest_id = int(dest_id)
        if source_id == dest_id: continue
        if dest_id not in PATHS[source_id]:
            # Skip any destinations that we don't have any paths for.
            # (This shouldn't happen anyway.)
            pass
        else:
            # For each destination, go over the intermediary stops and build
            # the segments and costs/durations info.
            path = PATHS[source_id][dest_id]
            segments = []
            cost = 0
            duration = 0
            for start, end in zip(path[:-1], path[1:]):
                start_name = STOPS_NAME_BY_ID[str(start)]
                end_name = STOPS_NAME_BY_ID[str(end)]
                info = GRAPH.edges[(start, end)]
                try:
                    station = STATIONS[STATIONS.Name == end_name].iloc[0]
                    end_lat = station.Latitude
                    end_lon = station.Longitude
                except IndexError:
                    end_lat = info['lon_lat'][1]
                    end_lon = info['lon_lat'][0]
                cost += info['weight']
                duration += info['duration']
                segments.append([start_name, end_name, info['weight'],
                                 info['duration'], end_lat, end_lon])
            if cost < min_cost: min_cost = cost
            if cost > budget: continue  # Skip if we're over budget.
            result.append({'segments': segments, 'cost': cost,
                           'duration': duration})
    # Return the sorted results, from most expensive to cheapest.
    # This makes it easier for the client (it'll draw them in that order,
    # meaning the cheapest lines will be on top and visible first).
    result = sorted(result, key=lambda k: k['cost'], reverse=True)
    return json.dumps({'start_lat': source_station.Latitude,
                       'start_lon': source_station.Longitude,
                       'paths': result, 'min_cost': min_cost})

@app.route('/get_monuments/<name>', methods=['GET'])
def get_monuments(name):
    '''Return the list of monuments for a city.'''
    mons = MONUMENTS[MONUMENTS.City == name][['Name', 'Status', 'Date', 'Link',
                                              'Image']]
    return json.dumps(mons.values.tolist())

@app.after_request
def after_request(response):
    '''This is to avoid security errors when debugging.'''
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers',
                         'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods',
                         'GET,PUT,POST,DELETE,OPTIONS')
    return response


if __name__ == '__main__':
    app.run()
