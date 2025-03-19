$(function() {
    var baseCols = 2;
    var baseRows = 2;
    var maxZoom = 3;
    var markers = [];

    var mapOptions = {
        center: new google.maps.LatLng(0, 0),
        zoom: maxZoom,
        disableDefaultUI: true,
        backgroundColor: '#000000'
    };

    var map = new google.maps.Map(document.getElementById('map'), mapOptions);

    var customMapType = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            if (zoom < 0 || zoom > maxZoom) return "";

            var cols = baseCols * Math.pow(2, zoom);
            var rows = baseRows * Math.pow(2, zoom);

            var normalizedX = ((coord.x % cols) + cols) % cols;
            var normalizedY = coord.y;

            if (normalizedY < 0 || normalizedY >= rows) {
                return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
            }

            return 'tiles/' + zoom + '/' + normalizedY + "_" + normalizedX + ".png";
        },
        tileSize: new google.maps.Size(256, 256),
        minZoom: 0,
        maxZoom: maxZoom,
        name: 'custom',
        opacity: 1
    });

    map.mapTypes.set('custom', customMapType);
    map.setMapTypeId('custom');

    google.maps.event.addListener(map, 'rightclick', function(e) {
        var marker = new google.maps.Marker({
            position: e.latLng,
            map: map,
            draggable: true,
            title: `Lat: ${e.latLng.lat().toFixed(3)}, Lng: ${e.latLng.lng().toFixed(3)}`
        });

        var infoWindow = new google.maps.InfoWindow({
            content: `<div>
                        <p>Latitude: ${e.latLng.lat().toFixed(3)}</p>
                        <p>Longitude: ${e.latLng.lng().toFixed(3)}</p>
                        <button onclick="deleteMarker(${markers.length})">Delete</button>
                    </div>`
        });

        marker.addListener('click', function() {
            infoWindow.open(map, marker);
        });

        marker.addListener('drag', function() {
            infoWindow.setContent(`<div>
                <p>Latitude: ${marker.getPosition().lat().toFixed(3)}</p>
                <p>Longitude: ${marker.getPosition().lng().toFixed(3)}</p>
                <button onclick="deleteMarker(${markers.length})">Delete</button>
            </div>`);
        });

        markers.push(marker);
    });

    function loadZones(jsonPath) {
        $.getJSON(jsonPath, function(data) {
            data.forEach(function(zone) {
                var polygon = new google.maps.Polygon({
                    paths: zone.coordinates,
                    strokeColor: '#' + (zone.strokeColor || 'FF0000'),
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#' + (zone.fillColor || 'FF0000'),
                    fillOpacity: 0.35,
                    map: map
                });

                polygon.addListener('click', function() {
                    new google.maps.InfoWindow({
                        content: `<div>
                            <h3>${zone.name || 'Unnamed Zone'}</h3>
                            <p>${zone.description || ''}</p>
                        </div>`,
                        position: polygon.getPath().getAt(0)
                    }).open(map);
                });
            });
        });
    }

    window.deleteMarker = function(index) {
        if (markers[index]) {
            markers[index].setMap(null);
            markers.splice(index, 1);
        }
    };

    $('<button>')
        .text('Export Markers')
        .css({
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000
        })
        .click(function() {
            var export_data = markers.map(function(marker) {
                return {
                    lat: marker.getPosition().lat(),
                    lng: marker.getPosition().lng()
                };
            });
            console.log(JSON.stringify(export_data, null, 2));
        })
        .appendTo('#map');

    loadZones('zones.json');
});