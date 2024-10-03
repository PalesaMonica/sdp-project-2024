let directionsService; // Declare these variables outside the initMap function
let directionsRenderer;

fetch("/api/get-map-key")
  .then((response) => response.json())
  .then((data) => {
    if (data.apiKey) {
      loadGoogleMaps(data.apiKey); // Load Google Maps with the fetched API key
    } else {
      console.error("API key not available");
    }
  })
  .catch((error) => {
    console.error("Error fetching the API key:", error);
  });

function loadGoogleMaps(apiKey) {
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
  script.async = true;
  document.body.appendChild(script);
}

function initMap() {
  let options = {
    center: { lat: -26.19285, lng: 28.03083 },
    zoom: 17,
  };

  const map = new google.maps.Map(document.getElementById("map"), options);
  google.maps.event.addListener(map, "click", function (event) {
    this.setOptions({ scrollwheel: true });
  });

  // Initialize the Directions service and renderer
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map); // Set the map for the directions renderer

  // Initialize autocomplete for source and destination
  const sourceAutoComplete = new google.maps.places.Autocomplete(
    document.getElementById("source")
  );
  const destinationAutoComplete = new google.maps.places.Autocomplete(
    document.getElementById("destination")
  );

  // Center the map on the user's current location
  getLocation(map);
}

function calculateRoute() {
  let source = document.getElementById("source").value;
  let destination = document.getElementById("destination").value;

  if (!source || !destination) {
    alert("Please enter both source and destination.");
    return;
  }

  let request = {
    origin: source,
    destination: destination,
    travelMode: google.maps.TravelMode.WALKING,
  };

  directionsService.route(request, function (result, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);
    } else {
      console.error("Directions request failed due to " + status);
    }
  });
}

const getLocation = (map) => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => showPosition(position, map),
      showError
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
};

const showPosition = (position, map) => {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  const userLocation = new google.maps.LatLng(lat, lng);
  map.setCenter(userLocation);
};

const showError = (error) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      alert("User denied the request for Geolocation.");
      break;
    case error.POSITION_UNAVAILABLE:
      alert("Location information is unavailable.");
      break;
    case error.TIMEOUT:
      alert("The request to get user location timed out.");
      break;
    case error.UNKNOWN_ERROR:
      alert("An unknown error occurred.");
      break;
  }
};
