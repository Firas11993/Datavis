from flask import Flask, url_for, send_from_directory, jsonify, request
import pandas as pd
import json

DATA_DIR = '../../data/'

app = Flask(__name__)
STATIONS = pd.read_csv(DATA_DIR + '_stations.csv').dropna()
with open(DATA_DIR + '_historic_cities.json') as infile:
    HISTORIC_CITIES = json.load(infile)
with open(DATA_DIR + '_art_history_cities.json') as infile:
    ART_HISTORY_CITIES = json.load(infile)

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
    return df.to_json(orient='index')

@app.after_request
def after_request(response):
  response.headers.add('Access-Control-Allow-Origin', '*')
  response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  return response

if __name__ == '__main__':
    app.run()
