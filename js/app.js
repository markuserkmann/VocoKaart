$(function() {
    var maxZoom = 5;
    var minZoom = 0;
    var markers = [];
    var tileSize = 256;

    var mapSize = tileSize * Math.pow(2, maxZoom);

    var map = L.map('map', {
        center: [mapSize/2, mapSize/2],
        zoom: maxZoom - 2,
        minZoom: minZoom,
        maxZoom: maxZoom,
        crs: L.CRS.Simple,
        maxBoundsViscosity: 1.0,
        zoomSnap: 1,
        wheelDebounceTime: 40
    });

    var southWest = map.unproject([0, mapSize], maxZoom);
    var northEast = map.unproject([mapSize, 0], maxZoom);
    var bounds = new L.LatLngBounds(southWest, northEast);
    map.setMaxBounds(bounds);

    L.tileLayer('./tiles/{z}/{y}_{x}.png', {
        attribution: 'Your Map',
        tms: false,
        noWrap: true,
        bounds: bounds,
        minZoom: minZoom,
        maxZoom: maxZoom,
        tileSize: tileSize,
        zoomOffset: 0,
        updateWhenIdle: true,
        keepBuffer: 2,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    }).addTo(map);

    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    var zonesLayer = L.layerGroup().addTo(map);
    var locationLayer = L.layerGroup().addTo(map);

    function loadZones() {
        $.getJSON('zones.json', function(data) {
            data.forEach(function(zone) {
                var polygon = L.polygon(zone.coordinates, {
                    color: zone.strokeColor || '#000000',
                    fillColor: zone.fillColor || '#ff0000',
                    fillOpacity: 0.2,
                    weight: 2
                }).addTo(zonesLayer);

                polygon.bindPopup(`
                    <div>
                        <h3>${zone.name || 'Unnamed Zone'}</h3>
                        <p>${zone.description || ''}</p>
                        <p>Area Coordinates:</p>
                        <ul>
                            ${zone.coordinates.map(coord => 
                                `<li>Lat: ${coord[0].toFixed(3)}, Lng: ${coord[1].toFixed(3)}</li>`
                            ).join('')}
                        </ul>
                    </div>
                `);
            });
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Failed to load zones:", textStatus, errorThrown);
        });
    }

    loadZones();

    var baseLayers = {};
    var overlays = {
        "Zones": zonesLayer,
        "Location Markers": locationLayer
    };
    L.control.layers(baseLayers, overlays, {
        position: 'topright'
    }).addTo(map);

    var filterControl = L.control({position: 'topleft'});
    filterControl.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'filter-control');
        div.innerHTML = `
            <select id="zoneFilter" onchange="filterZones(this.value)">
                <option value="all">All Schools</option>
                <option value="Ehituskool">Ehituskool</option>
                <option value="Ilukool">Ilukool</option>
                <option value="Turismikool">Turismikool</option>
                <option value="Ärikool">Ärikool</option>
                <option value="IT-Kool">IT-Kool</option>
            </select>
        `;
        return div;
    };
    filterControl.addTo(map);

    window.filterZones = function(type) {
        zonesLayer.clearLayers();
        $.getJSON('zones.json', function(data) {
            data.forEach(function(zone) {
                if (type === 'all' || zone.type === type) {
                    var polygon = L.polygon(zone.coordinates, {
                        color: zone.strokeColor || '#000000',
                        fillColor: zone.fillColor || '#ff0000',
                        fillOpacity: 0.2,
                        weight: 2
                    }).addTo(zonesLayer);

                    polygon.bindPopup(`
                        <div>
                            <h3>${zone.name || 'Unnamed Zone'}</h3>
                            <p>${zone.description || ''}</p>
                            <p>Type: ${zone.type}</p>
                            <button onclick="zoomToZone(${JSON.stringify(zone.coordinates)})">Zoom to Zone</button>
                            <button onclick="copyZoneLink(${JSON.stringify(zone.coordinates)})">Copy Link</button>
                        </div>
                    `);
                }
            });
        });
    };

    window.zoomToZone = function(coordinates) {
        var bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds);
    };

    window.copyZoneLink = function(coordinates) {
        var center = L.latLngBounds(coordinates).getCenter();
        var zoom = map.getZoom();
        var url = `${window.location.origin}${window.location.pathname}?lat=${center.lat}&lng=${center.lng}&zoom=${zoom}`;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    function checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = parseFloat(urlParams.get('lat'));
        const lng = parseFloat(urlParams.get('lng'));
        const zoom = parseInt(urlParams.get('zoom'));
        
        if (lat && lng) {
            map.setView([lat, lng], zoom || maxZoom - 2);
        }
    }

    var style = document.createElement('style');
    style.textContent = `
        .filter-control {
            background: white;
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0 1px 5px rgba(0,0,0,0.4);
        }
        .filter-control select {
            width: 150px;
            padding: 5px;
        }
    `;
    document.head.appendChild(style);

    loadZones();
    checkUrlParams();

    function showLocationMarker(latlng, fromUrl = false) {
        locationLayer.clearLayers();
        
        if (fromUrl) {
            L.circle(latlng, {
                color: '#2196F3',
                fillColor: '#2196F3',
                fillOpacity: 0.3,
                radius: 2,
                weight: 2
            }).addTo(locationLayer);

            var marker = L.marker(latlng).addTo(locationLayer);

            marker.bindPopup(`
                <div>
                    <h3>Teie asukoht</h3>
                </div>
            `).openPopup();

            return;
        }

        var marker = L.marker(latlng).addTo(locationLayer);
        
        marker.bindPopup(`
            <div>
                <h3>Location</h3>
                <p>Latitude: ${latlng.lat.toFixed(3)}</p>
                <p>Longitude: ${latlng.lng.toFixed(3)}</p>
                <button onclick="copyLocationLink(${latlng.lat}, ${latlng.lng})">Copy Location Link</button>
            </div>
        `).openPopup();
    }

    window.copyLocationLink = function(lat, lng) {
        var zoom = map.getZoom();
        var url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}&zoom=${zoom}`;
        navigator.clipboard.writeText(url);
        alert('Location link copied to clipboard!');
    };

    map.off('contextmenu');
    map.on('contextmenu', function(e) {
        if (bounds.contains(e.latlng)) {
            showLocationMarker(e.latlng, false);
        }
    });

    function checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = parseFloat(urlParams.get('lat'));
        const lng = parseFloat(urlParams.get('lng'));
        const zoom = parseInt(urlParams.get('zoom'));
        
        if (lat && lng) {
            map.setView([lat, lng], zoom || maxZoom - 2);
            showLocationMarker({lat: lat, lng: lng}, true);
        }
    }
});