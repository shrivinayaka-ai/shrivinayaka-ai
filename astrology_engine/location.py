def get_coordinates(place):

    place = place.lower().strip()

    # deterministic database (NO API, NO geopy)
    locations = {
        "delhi": {"latitude": 28.6139, "longitude": 77.2090},
        "new delhi": {"latitude": 28.6139, "longitude": 77.2090},
        "mumbai": {"latitude": 19.0760, "longitude": 72.8777},
        "kolkata": {"latitude": 22.5726, "longitude": 88.3639},
        "chennai": {"latitude": 13.0827, "longitude": 80.2707},
        "bangalore": {"latitude": 12.9716, "longitude": 77.5946}
    }

    if place in locations:
        return locations[place]

    return {
        "error": "Location not found. Please use: Delhi, Mumbai, Kolkata, Chennai, Bangalore"
    }