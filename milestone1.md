#Exploratory data analysis


Initial data viz / making sure our idea is feasible:

- Originally, we wanted to work on the SBB datasets but found they were lacking (no prices data), so we looked for another European trains operator and found SCNF.
- We used Jupyter notebooks to visualize tabular data with pandas/numpy and play around with the data.
- Coordinates / GeoJSON data: we used Folium in our Jupyter notebooks at first to make sure we have enough data for all of France.

Pre-processing:

- For the stations dataset (station IDs/names/coordinates), we pre-process the dataset to obtain a cleaned dataset with the columns  we care about and easy-to-use names (the original datasets are often in French and use some internal abbreviations). (Notebook: "preprocessing_1_stations.ipynb")
- For TER and intercity datasets, we pre-process the datasets to get well-separated and cleaned origin/destination names and prices (the naming convention is different from the stations dataset, so we had to fix that). (Notebook: "preprocessing_3_intercity.ipynb")
- We combine the above datasets to get the durations of the trips between two consecutive stops and its price (for both intercity+TER). (Notebook: "compute_durations_intercity_and_ter.ipynb")
- We then combine the above datasets to obtain the timetables for each station, which we use to build a graph (using networkx) from which we can easily extract paths from one station to another, trip durations and arrival/departure times (routing). Optimizing this part was also crucial.  Initially, we wanted to compute all possible destinations from a departure point, and prune the list later. However, this was not feasible: (1) One should not consider taking a 12 hour trip (2) it is far too computationally expensive.  We therefore decided to filter out all trips that don't fall within a given timeframe of trip duration (e.g. 8 hours).  (Notebooks: "preprocessing_4_build_graph.ipynb" and "routing.ipynb")
- We obtained the lane/track lines (with curves) as a GeoJSON file from SCNF.  Unfortunately, it's a list of disconnected points (not lines) so we had to pre-process this too to get a list of curves we can draw from a departure station to a destination. We will use this later to draw exact paths from one station to another instead of straight lines.  (Notebook: "preprocessing_lane_lines_from_geojson.ipynb")
- There have also pre-processed TGV stations/prices from one station to another, although we still need to see if we can integrate this (we're looking for a timetables dataset to be able to compute the durations).  Preliminary work is in "preprocessing_2_tgv.ipynb".

- To determine "important" cities, we leveraged Wikipedia articles about historic cities in France and extracted the list of (1) Villes et Pays d'art et d'histoire (link 1) (2) liste des monuments historiques par commune française (link 2; we extracted both the list of cities with monuments + the monuments themselves).  We might use the list of monuments later to display enriched information when the user clicks on a city. (Notebook: "get_wikipedia_data.ipynb")
Links:
Link 1: <https://fr.wikipedia.org/wiki/Villes_et_Pays_d'art_et_d'histoire>
Link 2: <https://fr.wikipedia.org/w/?title=Liste_des_monuments_historiques_par_commune_fran%C3%A7aise>

#Design

To visualize our data, we chose to display a map as this is the type of visualization that makes the most sense for our aim.

Technical design:
- We chose to separate our project into a web client and a web server, as loading the whole raw data at once is not a good solution (it could reach 100MB if we include the train track curve lines).
- The web client (JS + LeafletJS for the map) communicates with the server (Python, using Flask) to request data for the current view / city, and the server responds to that. For example, if the view is zoomed in, the server only sends the data of the cities within that view.

Perceptual / visual design decisions:

- Stops are shown as dots on the map. However, this would overwhelm the user (there are around 7000 stations) so we decided to show a restricted set of cities when the view is zoomed out. We still need to fine tune this part, but the current implementation is to show all stops in the current view if there are less than 200 of them. Otherwise, we only show "important" cities (e.g.  historic cities).
- When the user clicks on a dot, a popup shows up with extra information if applicable. For example, for stops that are the nearest to "important" cities, we show a list of these cities and their type (historic "Hist", or Pays d'Art/d'Histoire "ArtHist") The design of this still needs a lot of work.
- We also plan to show additional information in the future. For example, for historic cities, clicking on them should show the user more information about them as well as some historic monuments they can visit there.
- Our goal is for our map to be a network flow map, on which we can easily visualize the price of each trip, station by station.

Our current design is still minimalistic, as most of our time was spent on obtaining and pre-processing the data.