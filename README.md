# Project Description

This project should enable a user to visually plan his/her train/bus trip on a
budget and be able to see the trip duration and the price. The plan is, the
final project should show a map of Europe with different cities as potential
destinations, and the path to take to each one of them from a user-specified
starting location. Each "important" city along the route will be shown as a dot
on the map. The cities should be linked using edges which are coloured in a way
that indicates the price of the trip (e.g. the first segment starts coloured in
green, then fades to orange and red, eventually becoming black as the
cumulative price increases). The interactive visualisation should also show the
duration of the trip. 


In addition to being able to pick the starting point, the user should be able
to filter by budget and by countries/regions (which could be useful if a visa
is required).


The user should also be able to click on a city on the map to get a quick
overview of the city, as well as the type of activities he/she could do. We
could also include some photos of major city attractions and sights. Also, we
could include links to major trip guides websites such as TripAdvisor, hotel
booking websites (e.g booking.ch, airbnb etc).


At first, we plan to do this for major cities in Switzerland. Then, if we have
enough resources we could branch out to other countries in Europe.  

Our algorithm should take into account the connections between all cities as
well as the  importance of the cities to determine which cities to show on the
map, as showing all of the cities would be extremely messy to look at (e.g.
there are over 700 train stops in Switzerland in our dataset).

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
