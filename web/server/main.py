from flask import Flask, url_for, send_from_directory, jsonify, request
import pickle
import pandas as pd
import json

DATA_DIR = '../../data/'
TAG_HIST = 'Hist'
TAG_ARTHIST = 'ArtH'
print('Loading data...')
STATIONS = pd.read_csv(DATA_DIR + '_stations.csv').dropna()
with open(DATA_DIR + '_historic_cities.json') as infile:
    HISTORIC_CITIES = json.load(infile)
with open(DATA_DIR + '_art_history_cities.json') as infile:
    ART_HISTORY_CITIES = json.load(infile)
SPECIAL_CITIES = list(HISTORIC_CITIES.keys())
SPECIAL_CITIES.extend([item for item in SPECIAL_CITIES for SPECIAL_CITIES in ART_HISTORY_CITIES.values()])
with open(DATA_DIR + '_routing_stops_id_by_name.json') as infile:
    STOPS_ID_BY_NAME = json.load(infile)
with open(DATA_DIR + '_routing_stops_name_by_id.json') as infile:
    STOPS_NAME_BY_ID = json.load(infile)
with open(DATA_DIR + '_routing_paths.pkl', 'rb') as f:
    PATHS = pickle.load(f)
with open(DATA_DIR + '_routing_graph.pkl', 'rb') as f:
    GRAPH = pickle.load(f)
SPECIAL_STOPS_DF = pd.DataFrame.from_dict(STOPS_NAME_BY_ID, orient='index', columns=['name'])
SPECIAL_STOPS_DF = SPECIAL_STOPS_DF[SPECIAL_STOPS_DF.name.isin(SPECIAL_CITIES)]
print('Ready!')

app = Flask(__name__)

@app.route('/get_stations', methods=['GET'])
def get_stations():
    east = float(request.args.get('east'))
    west = float(request.args.get('west'))
    north = float(request.args.get('north'))
    south = float(request.args.get('south'))
    df = STATIONS
    df = df[(df.Longitude > west) & (df.Longitude < east) & (df.Latitude > south) & (df.Latitude < north)]
    df_imp = df[(df.Name.isin(HISTORIC_CITIES.keys())) | (df.Name.isin(ART_HISTORY_CITIES.keys()))]
    if len(df) > 100 and len(df_imp) > 5:
        df = df_imp
    df['Imp'] = df.index.isin(df_imp.index)
    return df.to_json(orient='index')

@app.route('/get_station_info/<name>', methods=['GET'])
def get_station_info(name):
    info = {'cities': {}}
    if name in HISTORIC_CITIES:
        for city in HISTORIC_CITIES[name]:
            info['cities'][city] = [TAG_HIST]
    if name in ART_HISTORY_CITIES:
        for city in ART_HISTORY_CITIES[name]:
            info['cities'][city] = ([*info['cities'][city], TAG_ARTHIST] if city in info['cities'] else [TAG_ARTHIST])
    info['important'] = len(info) > 0
    return json.dumps(info)

@app.route('/get_routes_from_source/<source_name>', methods=['GET'])
def get_routes_from_source(source_name):
    source_id = STOPS_ID_BY_NAME [source_name]
    result = []
    source_station = STATIONS[STATIONS.Name == source_name].iloc[0]
    for dest_id, dest_val in SPECIAL_STOPS_DF.iterrows():
        dest_id = int(dest_id)
        if source_id == dest_id: continue
        if dest_id not in PATHS[source_id]:
            pass
        else:
            path = PATHS[source_id][dest_id]
            segments = []
            cost = 0
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
                segments.append([start_name, end_name, info['weight'], info['departure_time'], info['arrival_time'], end_lat, end_lon])
            result.append({'segments': segments, 'cost': cost})
    result = sorted(result, key=lambda k: k['cost'], reverse=True)
    return json.dumps({'start_lat': source_station.Latitude, 'start_lon': source_station.Longitude, 'paths': result})

@app.after_request
def after_request(response):
  response.headers.add('Access-Control-Allow-Origin', '*')
  response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  return response

if __name__ == '__main__':
    app.run()
