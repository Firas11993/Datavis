# Project Description

This project should enable a user to visually plan his/her train/bus trip on a budget and be able to see the trip duration and the price. The plan is, the final project should show a map of Europe with different cities as potential destinations, and the path to take to each one of them from a user-specified starting location. Each "important" city along the route will be shown as a dot on the map. The cities should be linked using edges which are coloured in a way that indicates the price of the trip (e.g. the first segment starts coloured in green, then fades to orange and red, eventually becoming black as the cumulative price increases). The interactive visualisation should also show the duration of the trip. 


In addition to being able to pick the starting point, the user should be able to filter by budget and by countries/regions (which could be useful if a visa is required).


The user should also be able to click on a city on the map to get a quick overview of the city, as well as the type of activities he/she could do. We could also include some photos of major city attractions and sights. Also, we could include links to major trip guides websites such as TripAdvisor, hotel booking websites (e.g booking.ch, airbnb etc).


At first, we plan to do this for major cities in Switzerland. Then, if we have enough resources we could branch out to other countries in Europe. 
Our algorithm should take into account the connections between all cities as well as the  importance of the cities to determine which cities to show on the map, as showing all of the cities would be extremely messy to look at (e.g. there are over 700 train stops in Switzerland in our dataset).