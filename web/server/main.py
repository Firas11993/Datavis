from flask import Flask, url_for, send_from_directory, jsonify, request
import pandas as pd

DATA_DIR = '../../data/'
# FIXME: this is temporary -- we'll be loading the final list from a file.
T = {'Briançon', 'Bayonne', 'Grenoble', 'Blois', 'Arras', 'Angoulême', 'Béziers', 'Grasse', 'Niort', 'Tarascon', 'Nîmes', 'Saintes', 'Salins-les-Bains', 'Sélestat', 'Fréjus', 'Verdun', 'Perpignan', 'Thiers', 'Arles', 'Auray', 'Haguenau', 'Mende', 'Laval', 'Chartres', 'Poitiers', 'Vannes', 'Lisieux', 'Troyes', 'Tournus', 'Nantes', 'Tours', 'Amboise', 'Obernai', 'Gray', 'Pézenas', 'Albi', 'Dieppe', 'Vichy', 'Bourg-en-Bresse', 'Provins', 'Montbéliard', 'Honfleur', 'Alençon', 'Wissembourg', 'Beauvais', 'Brive-la-Gaillarde', 'Pont-à-Mousson', 'Chalon-sur-Saône', 'Rennes', 'Chinon', 'Colmar', 'Châtillon-sur-Seine', 'Orléans', 'Fontenay-le-Comte', 'Villeneuve-lès-Avignon', 'Cluny', 'Valenciennes', 'Autun', 'Dunkerque', 'Carpentras', 'Reims', 'Le Havre', 'Quimper', 'Roubaix', 'Aire-sur-la-Lys', 'Clermont-Ferrand', 'Amiens', 'Langres', 'Senlis', 'Bar-le-Duc', 'Dinan', 'Cahors', 'Loches', 'Sens', 'Épinal', 'Bourges', 'Soissons', 'Phalsbourg', 'Bayeux', 'Compiègne', 'Carcassonne', 'Fougères', 'Périgueux', 'Auch', 'Beaune', 'Alet-les-Bains', 'Châlons-en-Champagne', 'Vitré', 'Rouffach', 'Le Mans', 'Caen', 'Cambrai', 'Nevers', 'Ajaccio', 'Neufchâteau', 'Châteaudun', 'Vienne', 'Le Puy-en-Velay', 'Lannion', 'Rodez', 'Falaise', 'Morlaix', 'Aix-en-Provence', 'Agen', 'Charleville-Mézières', 'Douai', 'Villefranche-de-Rouergue', 'Beaucaire', 'Aurillac', 'Annecy', 'Toul', 'Lons-le-Saunier', 'Uzès', 'Hyères', 'Abbeville', 'Chaumont', 'Cognac', 'Figeac', 'Laon', 'Vendôme', 'Narbonne'}

app = Flask(__name__)

@app.route('/get_stations', methods=['GET'])
def get_stations():
    east = float(request.args.get('east'))
    west = float(request.args.get('west'))
    north = float(request.args.get('north'))
    south = float(request.args.get('south'))
    df = pd.read_csv(DATA_DIR + '_stations.csv')
    df = df.dropna()
    df = df[(df.Longitude > west) & (df.Longitude < east) & (df.Latitude > south) & (df.Latitude < north)]
    df_imp = df[df.Name.isin(T)]
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
