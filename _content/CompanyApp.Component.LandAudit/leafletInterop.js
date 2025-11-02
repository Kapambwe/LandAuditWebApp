// Leaflet Map Interop for Boundary Verification

let map = null;
let markers = [];
let polygons = [];

export function initializeMap(mapElementId, latitude, longitude, zoom) {
    // Clean up existing map if any
    if (map) {
        map.remove();
        map = null;
    }

    // Initialize the map
    map = L.map(mapElementId).setView([latitude, longitude], zoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    return true;
}

export function addMarker(latitude, longitude, popupText) {
    if (!map) return false;

    const marker = L.marker([latitude, longitude]).addTo(map);
    
    if (popupText) {
        marker.bindPopup(popupText);
    }
    
    markers.push(marker);
    return true;
}

export function addBoundaryPolygon(coordinates, popupText, color) {
    if (!map) return false;

    // Convert coordinates array to Leaflet format
    const latlngs = coordinates.map(coord => [coord.lat, coord.lng]);

    const polygon = L.polygon(latlngs, {
        color: color || '#ff7800',
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.3
    }).addTo(map);

    if (popupText) {
        polygon.bindPopup(popupText);
    }

    polygons.push(polygon);

    // Fit map to polygon bounds
    map.fitBounds(polygon.getBounds());

    return true;
}

export function addCircle(latitude, longitude, radius, popupText, color) {
    if (!map) return false;

    const circle = L.circle([latitude, longitude], {
        color: color || '#3388ff',
        fillColor: color || '#3388ff',
        fillOpacity: 0.3,
        radius: radius
    }).addTo(map);

    if (popupText) {
        circle.bindPopup(popupText);
    }

    polygons.push(circle);
    return true;
}

export function clearMarkers() {
    markers.forEach(marker => marker.remove());
    markers = [];
}

export function clearPolygons() {
    polygons.forEach(polygon => polygon.remove());
    polygons = [];
}

export function clearAll() {
    clearMarkers();
    clearPolygons();
}

export function destroyMap() {
    if (map) {
        clearAll();
        map.remove();
        map = null;
    }
}

export function fitBounds(coordinates) {
    if (!map) return false;

    const latlngs = coordinates.map(coord => [coord.lat, coord.lng]);
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds);
    
    return true;
}

export function setView(latitude, longitude, zoom) {
    if (!map) return false;
    
    map.setView([latitude, longitude], zoom);
    return true;
}
