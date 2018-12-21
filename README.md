# Project Description

- Let's say you are a student with a limited budget, but you still want to have
  fun on your vacation and feed your passion for travelling and discovering new
  places and people.  
  In that case, this application should be very useful for you if you want to
  travel around France. 
- On the map, you can see all the stops of historical cities with blue markers.
  If you zoom in, you can also see other stops of "non-historic" cities.  
  You can select your budget for the train ticket by using the scroller on the
  top left corner and the starting station by filling the text box right above
  it.
- Clicking on a stop will show some additional information on a sidebar to the
  left, such as, the interesting cities near the selected stop.
- You can click on a city name that appears in the left sidebar for a Wikipedia
  summary of the city as well as a list of monuments... You can also click on
  the button "set starting location" to select it as a starting station as an
  alternative to entering the station name in the text box.
- By selecting the starting station, you should see all the possible routes you
  could take with the chosen budget. The colors used for the edges reflect the
  price of the trip to a linked station. The closer the color to red the closer
  it is to your limit budget. Similarity, the closer it is to green the closer
  the trip price is to 0. This is also explained in the legend that appears
  right next to the scroller.
- You can also see all the important reachable cities by looking at the content
  of the sidebar to the right as well as seeing them by placing the mouse on an
  edge.
- By clicking on a specific destination on the right sidebar you can see more
  detailed intermediate important stops with information about ticket price and
  duration from one stop to the next. Another option is to click on an edge to
  directly obtain the view on the intermediate stops.

# Files

- `data/` directory: contains input datasets and cleaned datasets we generated
  (denoted by a starting `_`).
- `web/` directory: contains the web demo (client + server).
- `preprocessing_1_stations.ipynb`: pre-processing of the stations datasets.
  Output: a cleaned stations dataset with the columns we care about and
  easy-to-use names.
- `preprocessing_2_tgv.ipynb`: pre-processing of TGV prices for the given
  origins/departures. Output: a cleaned TGV prices dataset with well-separated
  and cleaned origin/destination names and prices.
- `preprocessing_3_intercity.ipynb`: pre-processing of intercity prices for the
  given origins and destinations. Output: a cleaned intercity prices dataset
  with cleaned origin/destination names and prices.
- `preprocessing_4_build_graph.ipynb`: builds a basic graph from the above
  cleaned datasets and shows a starting example.
- `preprocessing_lane_lines_from_geojson.ipynb`: get lane/track lines (with
  curves) from the GeoJSON file containing all lane/track points (separately)
  in a way that can be used to draw the path from a departure station to a
  destination.
- `get_wikipedia_data.ipynb`: determine "important" cities from Wikipedia, and
  their list of historic monuments where applicable.
- `compute_durations_intercity_and_ter.ipynb`: get train departure/arrival
  times and durations per station for intercity and TER.

Note that files whose name begins with `type_<NUM>` must be run in sequence, as
they may depend on the output of previous files. For example,
`preprocessing_2_tgv.ipynb` must be run after `preprocessing_1_stations.ipynb`.

# Running the webpage / server

Our data viz has two components, a client and a server. Running the server is
done by using Flask from the `web/server` directory:
```bash
$ cd web/server/
$ FLASK_APP=main.py flask run
```

Once the server is running, you can simply open `index.html` from the
`web/client` directory.

# Dependencies

Server dependencies:

- [networkx](https://pypi.org/project/networkx/)
- [pandas](https://pypi.org/project/pandas/)
- [flask](https://pypi.org/project/Flask/)

Libraries/templates used for the client:

- [Bootstrap](https://getbootstrap.com/) with [Clean Blog template](https://github.com/BlackrockDigital/startbootstrap-clean-blog)
- [Leaflet](https://leafletjs.com/)
- [sidebar-v2](https://github.com/Turbo87/sidebar-v2)
- [Leaflet-snogylop](https://github.com/ebrelsford/Leaflet.snogylop)
- [materializecss](https://materializecss.com/)
- [Leaflet.EasyButton](https://github.com/CliffCloud/Leaflet.EasyButton/)
- [Leaflet.Polyline.SnakeAnim](https://github.com/IvanSanchez/Leaflet.Polyline.SnakeAnim/)
- [Wikipedia.JS](http://okfnlabs.org/wikipediajs/)
- [Chroma.js](https://github.com/gka/chroma.js)
- [jQuery](https://jquery.com/)

Pre-processing dependencies (depends on the specific notebook):

- [pandas](https://pypi.org/project/pandas/)
- [numpy](https://pypi.org/project/numpy/)
- [networkx](https://pypi.org/project/networkx/)
- [swifter](https://pypi.org/project/swifter/)
- [folium](https://pypi.org/project/folium/)
