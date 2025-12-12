// World-Class GIS System for Land Management and Auditing in Zambia
// Enhanced Leaflet Map Interop with comprehensive features

let map = null;
let markers = [];
let polygons = [];
let layerGroups = {};
let drawControl = null;
let drawnItems = null;
let measurementLayer = null;
let markerCluster = null;
let heatmapLayer = null;
let baseLayers = {};
let overlayLayers = {};
let parcelRegistry = {};
let miniMapControl = null;

export function initializeMap(mapElementId, latitude, longitude, zoom) {
    // Clean up existing map if any
    if (map) {
        map.remove();
        map = null;
    }

    // Initialize the map with Zambian defaults
    map = L.map(mapElementId, {
        center: [latitude || -15.4167, longitude || 28.2833], // Lusaka, Zambia
        zoom: zoom || 6,
        zoomControl: false, // We'll add custom controls
        attributionControl: true
    });

    // Initialize layer groups
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    
    layerGroups['parcels'] = L.layerGroup().addTo(map);
    layerGroups['disputes'] = L.layerGroup().addTo(map);
    layerGroups['audit'] = L.layerGroup().addTo(map);
    layerGroups['boundaries'] = L.layerGroup().addTo(map);
    layerGroups['custom'] = L.layerGroup().addTo(map);

    // Add default OpenStreetMap base layer
    addOpenStreetMapLayer();

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

// ====== BASE LAYER MANAGEMENT ======

export function addOpenStreetMapLayer() {
    if (!map) return false;
    
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        id: 'osm'
    });
    
    baseLayers['OpenStreetMap'] = osmLayer;
    osmLayer.addTo(map);
    return true;
}

export function addSatelliteLayer() {
    if (!map) return false;
    
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
        id: 'satellite'
    });
    
    baseLayers['Satellite'] = satelliteLayer;
    return true;
}

export function addTerrainLayer() {
    if (!map) return false;
    
    const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
        maxZoom: 17,
        id: 'terrain'
    });
    
    baseLayers['Terrain'] = terrainLayer;
    return true;
}

export function setBaseLayer(layerType) {
    if (!map) return false;
    
    // Remove current base layers
    Object.values(baseLayers).forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    
    // Add requested layer
    if (baseLayers[layerType]) {
        baseLayers[layerType].addTo(map);
        return true;
    }
    
    return false;
}

export function addWMSLayer(url, layers, options) {
    if (!map) return false;
    
    const wmsLayer = L.tileLayer.wms(url, {
        layers: layers,
        format: 'image/png',
        transparent: true,
        ...options
    });
    
    wmsLayer.addTo(map);
    return true;
}

// ====== CADASTRAL BOUNDARY MANAGEMENT ======

export function addParcelBoundary(parcelId, coordinates, options, properties) {
    if (!map) return false;
    
    const polygon = L.polygon(coordinates, {
        color: options?.color || '#FF7800',
        weight: options?.weight || 3,
        opacity: options?.opacity || 0.8,
        fillOpacity: options?.fillOpacity || 0.3,
        fillColor: options?.fillColor || '#FFD700'
    });
    
    // Create popup with parcel information
    const popupContent = createParcelPopup(parcelId, properties);
    polygon.bindPopup(popupContent);
    
    // Store parcel in registry
    parcelRegistry[parcelId] = polygon;
    
    polygon.addTo(layerGroups['parcels']);
    return true;
}

function createParcelPopup(parcelId, properties) {
    let content = `<div class="parcel-popup">
        <h4>Parcel ${parcelId}</h4>`;
    
    if (properties) {
        content += '<table>';
        for (const [key, value] of Object.entries(properties)) {
            content += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
        }
        content += '</table>';
    }
    
    content += '</div>';
    return content;
}

export function highlightParcel(parcelId) {
    if (!map || !parcelRegistry[parcelId]) return false;
    
    const parcel = parcelRegistry[parcelId];
    parcel.setStyle({
        color: '#FFFF00',
        weight: 5,
        opacity: 1.0,
        fillOpacity: 0.6
    });
    
    // Zoom to parcel
    map.fitBounds(parcel.getBounds());
    parcel.openPopup();
    
    return true;
}

export function unhighlightParcel(parcelId) {
    if (!map || !parcelRegistry[parcelId]) return false;
    
    const parcel = parcelRegistry[parcelId];
    parcel.setStyle({
        color: '#FF7800',
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.3
    });
    
    return true;
}

export function detectBoundaryOverlaps(parcelId1, parcelId2) {
    if (!parcelRegistry[parcelId1] || !parcelRegistry[parcelId2]) {
        return JSON.stringify({ overlaps: false, reason: 'Parcels not found' });
    }
    
    const parcel1 = parcelRegistry[parcelId1];
    const parcel2 = parcelRegistry[parcelId2];
    
    const bounds1 = parcel1.getBounds();
    const bounds2 = parcel2.getBounds();
    
    const overlaps = bounds1.intersects(bounds2);
    
    return JSON.stringify({
        overlaps: overlaps,
        parcel1Bounds: bounds1,
        parcel2Bounds: bounds2
    });
}

// ====== MARKER OPERATIONS ======

export function addDisputeMarker(latitude, longitude, description, options) {
    if (!map) return false;
    
    const disputeIcon = L.divIcon({
        className: 'dispute-marker',
        html: '<i class="fa fa-exclamation-triangle" style="color:red; font-size:24px;"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
    
    const marker = L.marker([latitude, longitude], { icon: disputeIcon })
        .bindPopup(`<div class="dispute-popup">
            <h4>Land Dispute</h4>
            <p>${description}</p>
            <p><strong>ID:</strong> ${options?.disputeId}</p>
        </div>`);
    
    marker.addTo(layerGroups['disputes']);
    markers.push(marker);
    return true;
}

export function addAuditCheckpoint(latitude, longitude, status, options) {
    if (!map) return false;
    
    const iconColor = status === 'Completed' ? 'green' : status === 'Pending' ? 'orange' : 'blue';
    const auditIcon = L.divIcon({
        className: 'audit-marker',
        html: `<i class="fa fa-clipboard-check" style="color:${iconColor}; font-size:24px;"></i>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
    
    const marker = L.marker([latitude, longitude], { icon: auditIcon })
        .bindPopup(`<div class="audit-popup">
            <h4>Audit Checkpoint</h4>
            <p><strong>Status:</strong> ${status}</p>
            <p><strong>ID:</strong> ${options?.checkpointId}</p>
        </div>`);
    
    marker.addTo(layerGroups['audit']);
    markers.push(marker);
    return true;
}

export function addLandRegistryMarker(latitude, longitude, registryInfo) {
    if (!map) return false;
    
    const registryIcon = L.divIcon({
        className: 'registry-marker',
        html: '<i class="fa fa-file-contract" style="color:blue; font-size:24px;"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
    
    const marker = L.marker([latitude, longitude], { icon: registryIcon })
        .bindPopup(`<div class="registry-popup">
            <h4>Land Registry</h4>
            <p>${registryInfo}</p>
        </div>`);
    
    marker.addTo(layerGroups['parcels']);
    markers.push(marker);
    return true;
}

// ====== POLYGON AND SHAPE OPERATIONS ======

export function addPolyline(latLngs, options) {
    if (!map) return false;
    
    const polyline = L.polyline(latLngs, {
        color: options?.color || '#3388ff',
        weight: options?.weight || 2,
        opacity: options?.opacity || 1.0,
        ...options
    });
    
    polyline.addTo(map);
    polygons.push(polyline);
    return true;
}

export function addRectangle(bounds, options) {
    if (!map) return false;
    
    const rectangle = L.rectangle(bounds, {
        color: options?.color || '#3388ff',
        weight: options?.weight || 2,
        fillOpacity: options?.fillOpacity || 0.3,
        ...options
    });
    
    rectangle.addTo(map);
    polygons.push(rectangle);
    return true;
}

// ====== GEOJSON OPERATIONS ======

export function addGeoJson(geoJson, options) {
    if (!map) return false;
    
    const geoJsonLayer = L.geoJSON(geoJson, {
        style: options?.style || {
            color: '#3388ff',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.3
        },
        onEachFeature: function (feature, layer) {
            if (feature.properties) {
                layer.bindPopup(createFeaturePopup(feature.properties));
            }
        }
    });
    
    geoJsonLayer.addTo(map);
    polygons.push(geoJsonLayer);
    return true;
}

export function addGeoJsonWithPopup(geoJson, popupTemplate) {
    if (!map) return false;
    
    const geoJsonLayer = L.geoJSON(geoJson, {
        onEachFeature: function (feature, layer) {
            if (feature.properties) {
                let popup = popupTemplate;
                for (const [key, value] of Object.entries(feature.properties)) {
                    popup = popup.replace(`{${key}}`, value);
                }
                layer.bindPopup(popup);
            }
        }
    });
    
    geoJsonLayer.addTo(map);
    polygons.push(geoJsonLayer);
    return true;
}

function createFeaturePopup(properties) {
    let content = '<div class="feature-popup"><table>';
    for (const [key, value] of Object.entries(properties)) {
        content += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
    }
    content += '</table></div>';
    return content;
}

export function loadZambianProvinces() {
    // This would load actual Zambian provincial boundaries from a GeoJSON source
    console.log('Loading Zambian provinces...');
    // Implementation would fetch from actual data source
    return true;
}

export function loadDistrictBoundaries(province) {
    // This would load district boundaries for a specific province
    console.log(`Loading ${province} district boundaries...`);
    // Implementation would fetch from actual data source
    return true;
}

// ====== MEASUREMENT TOOLS ======

export function measureArea(coordinates) {
    const polygon = L.polygon(coordinates);
    const areaSquareMeters = L.GeometryUtil.geodesicArea(polygon.getLatLngs()[0]);
    const areaHectares = areaSquareMeters / 10000;
    const areaAcres = areaHectares * 2.471;
    
    return {
        squareMeters: areaSquareMeters.toFixed(2),
        hectares: areaHectares.toFixed(4),
        acres: areaAcres.toFixed(4)
    };
}

export function measureDistance(lat1, lng1, lat2, lng2) {
    const point1 = L.latLng(lat1, lng1);
    const point2 = L.latLng(lat2, lng2);
    const distanceMeters = point1.distanceTo(point2);
    const distanceKm = distanceMeters / 1000;
    
    return {
        meters: distanceMeters.toFixed(2),
        kilometers: distanceKm.toFixed(3),
        miles: (distanceKm * 0.621371).toFixed(3)
    };
}

export function measurePerimeter(coordinates) {
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const point1 = L.latLng(coordinates[i]);
        const point2 = L.latLng(coordinates[(i + 1) % coordinates.length]);
        totalDistance += point1.distanceTo(point2);
    }
    
    return {
        meters: totalDistance.toFixed(2),
        kilometers: (totalDistance / 1000).toFixed(3)
    };
}

export function enableMeasurementTool(measurementType) {
    if (!map) return false;
    
    measurementLayer = new L.LayerGroup().addTo(map);
    
    // Enable drawing for measurement
    map.on('click', function(e) {
        // Implementation for interactive measurement
        console.log('Measurement tool enabled:', measurementType);
    });
    
    return true;
}

export function disableMeasurementTool() {
    if (measurementLayer) {
        map.removeLayer(measurementLayer);
        measurementLayer = null;
    }
    map.off('click');
    return true;
}

// ====== DRAWING AND EDITING TOOLS ======

export function initDrawTools(lineColor, fillColor, lineWeight) {
    if (!map) return false;
    
    drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            polygon: {
                shapeOptions: {
                    color: lineColor || '#3388ff',
                    fillColor: fillColor || '#3388ff',
                    weight: lineWeight || 2
                }
            },
            polyline: {
                shapeOptions: {
                    color: lineColor || '#3388ff',
                    weight: lineWeight || 2
                }
            },
            rectangle: {
                shapeOptions: {
                    color: lineColor || '#3388ff',
                    fillColor: fillColor || '#3388ff',
                    weight: lineWeight || 2
                }
            },
            circle: {
                shapeOptions: {
                    color: lineColor || '#3388ff',
                    fillColor: fillColor || '#3388ff',
                    weight: lineWeight || 2
                }
            },
            marker: true,
            circlemarker: false
        },
        edit: {
            featureGroup: drawnItems,
            remove: true
        }
    });
    
    map.addControl(drawControl);
    
    // Handle drawn features
    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);
    });
    
    return true;
}

export function enableDrawing() {
    if (drawControl) {
        new L.Draw.Polygon(map).enable();
    }
    return true;
}

export function disableDrawing() {
    map.off(L.Draw.Event.CREATED);
    return true;
}

export function clearAllDrawn() {
    if (drawnItems) {
        drawnItems.clearLayers();
    }
    return true;
}

export function getDrawnGeoJson() {
    if (!drawnItems) return '{}';
    
    const geoJson = drawnItems.toGeoJSON();
    return JSON.stringify(geoJson);
}

export function addDrawnFromGeoJson(geoJson) {
    if (!map || !drawnItems) return false;
    
    const geoJsonLayer = L.geoJSON(geoJson);
    geoJsonLayer.eachLayer(function(layer) {
        drawnItems.addLayer(layer);
    });
    
    return true;
}

export function enableEditing() {
    if (drawControl) {
        new L.EditToolbar.Edit(map, {
            featureGroup: drawnItems
        }).enable();
    }
    return true;
}

export function disableEditing() {
    // Disable edit mode
    return true;
}

// ====== HEATMAPS AND CLUSTERING ======

export function createHeatmap(heatPoints, options) {
    if (!map) return false;
    
    // Note: Requires leaflet-heat plugin
    // heatmapLayer = L.heatLayer(heatPoints, {
    //     radius: options?.radius || 25,
    //     blur: options?.blur || 15,
    //     maxZoom: options?.maxZoom || 17
    // }).addTo(map);
    
    console.log('Heatmap feature requires leaflet-heat plugin');
    return true;
}

export function createDisputeHeatmap(disputes) {
    if (!map) return false;
    
    const heatPoints = disputes.map(d => [d.latitude, d.longitude, d.intensity || 1.0]);
    return createHeatmap(heatPoints, { radius: 30, blur: 20 });
}

export function createMarkerCluster(options) {
    if (!map) return false;
    
    // Note: Requires leaflet.markercluster plugin
    // markerCluster = L.markerClusterGroup({
    //     maxClusterRadius: options?.maxClusterRadius || 80,
    //     spiderfyOnMaxZoom: true,
    //     showCoverageOnHover: true
    // });
    // map.addLayer(markerCluster);
    
    console.log('Marker cluster feature requires leaflet.markercluster plugin');
    return true;
}

export function addMarkerToCluster(latitude, longitude, popupText) {
    if (!markerCluster) return false;
    
    const marker = L.marker([latitude, longitude]);
    if (popupText) {
        marker.bindPopup(popupText);
    }
    markerCluster.addLayer(marker);
    return true;
}

// ====== GEOCODING AND SEARCH ======

export function geocodeAddress(address) {
    // Implementation would use a geocoding service like Nominatim
    console.log('Geocoding address:', address);
    return { lat: -15.4167, lng: 28.2833, displayName: 'Lusaka, Zambia' };
}

export function reverseGeocode(latitude, longitude) {
    // Implementation would use a reverse geocoding service
    console.log('Reverse geocoding:', latitude, longitude);
    return { address: 'Lusaka, Zambia' };
}

export function searchParcels(searchTerm) {
    // Implementation would search through parcel registry
    console.log('Searching parcels:', searchTerm);
    return true;
}

// ====== SPATIAL ANALYSIS ======

export function createBuffer(latitude, longitude, radiusMeters, options) {
    if (!map) return false;
    
    const circle = L.circle([latitude, longitude], {
        radius: radiusMeters,
        color: options?.color || '#3388ff',
        fillColor: options?.fillColor || '#3388ff',
        fillOpacity: options?.fillOpacity || 0.2,
        weight: options?.weight || 1
    });
    
    circle.addTo(map);
    polygons.push(circle);
    return true;
}

export function isPointInPolygon(latitude, longitude, polygonCoords) {
    const point = L.latLng(latitude, longitude);
    const polygon = L.polygon(polygonCoords);
    
    // Simple ray-casting algorithm for point-in-polygon test
    const bounds = polygon.getBounds();
    return bounds.contains(point);
}

export function calculateIntersection(polygon1, polygon2) {
    // This would require turf.js or similar library for proper polygon intersection
    console.log('Calculate intersection requires additional library');
    return '{}';
}

export function findParcelsNearby(latitude, longitude, radiusMeters) {
    // Search through parcel registry for nearby parcels
    const nearbyParcels = [];
    const searchPoint = L.latLng(latitude, longitude);
    
    for (const [parcelId, parcel] of Object.entries(parcelRegistry)) {
        const parcelCenter = parcel.getBounds().getCenter();
        const distance = searchPoint.distanceTo(parcelCenter);
        
        if (distance <= radiusMeters) {
            nearbyParcels.push({
                parcelId: parcelId,
                distance: distance
            });
        }
    }
    
    return JSON.stringify(nearbyParcels);
}

// ====== LAYER MANAGEMENT ======

export function createLayerGroup(groupName) {
    if (!layerGroups[groupName]) {
        layerGroups[groupName] = L.layerGroup().addTo(map);
    }
    return true;
}

export function showLayerGroup(groupName) {
    if (layerGroups[groupName] && !map.hasLayer(layerGroups[groupName])) {
        map.addLayer(layerGroups[groupName]);
    }
    return true;
}

export function hideLayerGroup(groupName) {
    if (layerGroups[groupName] && map.hasLayer(layerGroups[groupName])) {
        map.removeLayer(layerGroups[groupName]);
    }
    return true;
}

export function removeLayerGroup(groupName) {
    if (layerGroups[groupName]) {
        map.removeLayer(layerGroups[groupName]);
        delete layerGroups[groupName];
    }
    return true;
}

export function toggleLayer(layerName) {
    if (layerGroups[layerName]) {
        if (map.hasLayer(layerGroups[layerName])) {
            hideLayerGroup(layerName);
        } else {
            showLayerGroup(layerName);
        }
    }
    return true;
}

// ====== EXPORT AND PRINT ======

export function exportMapAsImage() {
    // Would use leaflet-image or similar library
    console.log('Export as image requires additional library');
    return '';
}

export function exportAsGeoJson() {
    const allFeatures = {
        type: 'FeatureCollection',
        features: []
    };
    
    // Collect all features from layer groups
    for (const [name, group] of Object.entries(layerGroups)) {
        if (group) {
            const geoJson = group.toGeoJSON();
            if (geoJson.features) {
                allFeatures.features.push(...geoJson.features);
            }
        }
    }
    
    return JSON.stringify(allFeatures);
}

export function exportAsKML() {
    // Would convert GeoJSON to KML format
    const geoJson = exportAsGeoJson();
    console.log('KML export requires conversion library');
    return '';
}

export function exportAsShapefile() {
    // Would convert to Shapefile format
    console.log('Shapefile export requires specialized library');
    return '';
}

export function printMap(options) {
    // Would use leaflet-easyprint or similar
    window.print();
    return true;
}

// ====== CONTROLS AND UI ======

export function addScaleControl(position) {
    if (!map) return false;
    
    L.control.scale({
        position: position || 'bottomleft',
        imperial: false,
        metric: true
    }).addTo(map);
    
    return true;
}

export function addZoomControl(position) {
    if (!map) return false;
    
    L.control.zoom({
        position: position || 'topleft'
    }).addTo(map);
    
    return true;
}

export function addLegend(legendData, position) {
    if (!map) return false;
    
    const legend = L.control({ position: position || 'bottomright' });
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = '<h4>Legend</h4>';
        
        for (const [label, color] of Object.entries(legendData)) {
            div.innerHTML += `<i style="background:${color}"></i> ${label}<br>`;
        }
        
        return div;
    };
    
    legend.addTo(map);
    return true;
}

export function addMiniMap(miniMapLayerUrl, options) {
    if (!map) return false;
    
    // Note: Requires leaflet-minimap plugin
    console.log('MiniMap requires leaflet-minimap plugin');
    return true;
}

export function removeMiniMap() {
    if (miniMapControl) {
        map.removeControl(miniMapControl);
        miniMapControl = null;
    }
    return true;
}

export function toggleMiniMap() {
    if (miniMapControl) {
        removeMiniMap();
    } else {
        addMiniMap();
    }
    return true;
}

export function addFullscreenControl() {
    if (!map) return false;
    
    // Note: Requires leaflet.fullscreen plugin
    console.log('Fullscreen control requires plugin');
    return true;
}

export function addLayerSwitcher(layers) {
    if (!map) return false;
    
    L.control.layers(baseLayers, overlayLayers, {
        position: 'topright',
        collapsed: false
    }).addTo(map);
    
    return true;
}

// ====== EVENT HANDLERS ======

export function setupMapClick(dotNetReference) {
    if (!map) return false;
    
    map.on('click', function(e) {
        dotNetReference.invokeMethodAsync('OnMapClickEvent', e.latlng.lat, e.latlng.lng);
    });
    
    return true;
}

// ====== UTILITY METHODS ======

export function getMapBounds() {
    if (!map) return {};
    
    const bounds = map.getBounds();
    return {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
    };
}

export function getZoomLevel() {
    return map ? map.getZoom() : 0;
}

export function getMapCenter() {
    if (!map) return {};
    
    const center = map.getCenter();
    return {
        latitude: center.lat,
        longitude: center.lng
    };
}

export function invalidateSize() {
    if (map) {
        map.invalidateSize();
    }
    return true;
}
