// streetview.js - Google Street View & Mapillary Integration
// ============================================
// API KEYS - Replace with your keys
// ============================================
const GOOGLE_MAPS_API_KEY = 'AIzaSyBhG_FVUHo8UiYi6SgsnrsUDhEiobzvGio';
const MAPILLARY_CLIENT_TOKEN = 'MLY|24314119614934772|574fb7a546cc6d61a240f83f11e151c2';

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Calculate bearing between two coordinates in degrees
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    
    return (bearing + 360) % 360;
}

/**
 * Get cardinal direction from bearing
 */
function getDirection(bearing) {
    if (bearing >= 315 || bearing < 45) return 'North';
    if (bearing >= 45 && bearing < 135) return 'East';
    if (bearing >= 135 && bearing < 225) return 'South';
    return 'West';
}

/**
 * Calculate a point at a given distance and bearing from origin
 */
function calculatePointAtDistance(lat, lng, distanceMeters, bearingDegrees) {
    const R = 6371000;
    const bearing = bearingDegrees * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lng1 = lng * Math.PI / 180;

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceMeters / R) +
                           Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(bearing));
    
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(distanceMeters / R) * Math.cos(lat1),
                                   Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2));

    return {
        lat: lat2 * 180 / Math.PI,
        lng: lng2 * 180 / Math.PI
    };
}

/**
 * Fetch Google Street View images around a pin location
 * Searches at specific distances: 50m, 100m, 150m, 200m, 250m
 */
async function fetchGoogleStreetView(pinCoords) {
    try {
        console.log('Fetching Google Street View for location:', pinCoords);
        
        const searchPoints = [];
        const distances = [50, 100, 150, 200, 250]; // Target distances in meters
        const anglesPerDistance = 8; // 8 angles per distance (every 45 degrees)
        
        // Generate search points at specific distances
        distances.forEach(distance => {
            for (let i = 0; i < anglesPerDistance; i++) {
                const angle = (360 / anglesPerDistance) * i;
                const point = calculatePointAtDistance(pinCoords[1], pinCoords[0], distance, angle);
                searchPoints.push({ lat: point.lat, lng: point.lng, angle, dist: distance });
            }
        });

        console.log(`Searching ${searchPoints.length} Google Street View points at distances: ${distances.join('m, ')}m`);

        const promises = searchPoints.map(async point => {
            const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${point.lat},${point.lng}&radius=50&key=${GOOGLE_MAPS_API_KEY}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status === 'OK') {
                    const panoLat = data.location.lat;
                    const panoLng = data.location.lng;
                    const distance = calculateDistance(pinCoords[1], pinCoords[0], panoLat, panoLng);
                    
                    // Accept all distances since we're targeting specific ranges
                    const bearing = calculateBearing(pinCoords[1], pinCoords[0], panoLat, panoLng);
                    return {
                        id: data.pano_id,
                        source: 'google',
                        distance: distance,
                        bearing: bearing,
                        direction: getDirection(bearing),
                        thumbnail: `https://maps.googleapis.com/maps/api/streetview?size=640x360&location=${panoLat},${panoLng}&fov=90&key=${GOOGLE_MAPS_API_KEY}`,
                        coordinates: [panoLng, panoLat],
                        captured_at: data.date || null,
                        url: `https://www.google.com/maps/@?api=1&map_action=pano&pano=${data.pano_id}`,
                        targetDistance: point.dist // Store the target distance we searched at
                    };
                }
            } catch (e) {
                console.error('Error fetching Street View point:', e);
            }
            return null;
        });

        const results = await Promise.all(promises);
        const validImages = results.filter(img => img !== null);

        const uniqueImages = [];
        const seenIds = new Set();
        for (const img of validImages) {
            if (!seenIds.has(img.id)) {
                seenIds.add(img.id);
                uniqueImages.push(img);
            }
        }

        console.log(`Google: ${uniqueImages.length} unique panoramas found`);
        console.log(`Distance breakdown:`, distances.map(d => {
            const count = uniqueImages.filter(img => Math.abs(img.targetDistance - d) < 25).length;
            return `${d}m: ${count}`;
        }).join(', '));
        
        return uniqueImages;
    } catch (error) {
        console.error('Error fetching Google Street View:', error);
        return [];
    }
}

/**
 * Fetch Mapillary images around a pin location
 */
async function fetchMapillaryImages(pinCoords) {
    try {
        console.log('Fetching Mapillary images for location:', pinCoords);
        
        const bufferDegrees = 0.0015;
        const bbox = [
            pinCoords[0] - bufferDegrees,
            pinCoords[1] - bufferDegrees,
            pinCoords[0] + bufferDegrees,
            pinCoords[1] + bufferDegrees
        ];
        
        const url = `https://graph.mapillary.com/images?access_token=${MAPILLARY_CLIENT_TOKEN}&fields=id,geometry,captured_at,thumb_1024_url,compass_angle&bbox=${bbox.join(',')}&limit=2000`;
        
        console.log('Mapillary bbox:', bbox);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error('Mapillary API error:', data.error);
            return [];
        }
        
        if (!data.data || data.data.length === 0) {
            console.log('No Mapillary images found in bbox');
            return [];
        }
        
        console.log(`Mapillary: ${data.data.length} images found in bbox`);
        
        const processedImages = data.data
            .map(img => {
                const imgLng = img.geometry.coordinates[0];
                const imgLat = img.geometry.coordinates[1];
                const distance = calculateDistance(pinCoords[1], pinCoords[0], imgLat, imgLng);
                
                return {
                    ...img,
                    distance
                };
            })
            .filter(img => img.distance >= 10 && img.distance <= 100)
            .map(img => {
                const imgLng = img.geometry.coordinates[0];
                const imgLat = img.geometry.coordinates[1];
                const bearing = calculateBearing(pinCoords[1], pinCoords[0], imgLat, imgLng);
                
                return {
                    id: img.id,
                    source: 'mapillary',
                    distance: img.distance,
                    bearing: bearing,
                    direction: getDirection(bearing),
                    thumbnail: img.thumb_1024_url,
                    coordinates: [imgLng, imgLat],
                    captured_at: img.captured_at,
                    compassAngle: img.compass_angle || 0,
                    url: `https://www.mapillary.com/app/?pKey=${img.id}`
                };
            });
        
        console.log(`Mapillary: ${processedImages.length} images in 10-100m range`);
        return processedImages;
    } catch (error) {
        console.error('Error fetching Mapillary images:', error);
        return [];
    }
}

/**
 * Fetch combined images from both Google Street View and Mapillary
 */
async function fetchCombinedStreetView(pinCoords) {
    try {
        const [googleImages, mapillaryImages] = await Promise.all([
            fetchGoogleStreetView(pinCoords),
            fetchMapillaryImages(pinCoords)
        ]);
        
        console.log(`Combined: ${googleImages.length} Google + ${mapillaryImages.length} Mapillary = ${googleImages.length + mapillaryImages.length} total images`);
        
        return [...googleImages, ...mapillaryImages];
    } catch (error) {
        console.error('Error fetching combined street view:', error);
        return [];
    }
}

/**
 * Display street view images in the sidebar
 */
function displayStreetViewImages(images) {
    const container = document.getElementById('streetViewContainer');
    const count = document.getElementById('streetViewCount');
    
    count.textContent = images.length;
    
    if (images.length === 0) {
        container.innerHTML = '<div class="no-streetview">სამწუხაროდ, ვერ ვიპოვეთ ქუჩის ფოტოები ამ არეალში...</div>';
        return;
    }

    let html = '<div class="streetview-images">';
    
    html += images.map((img) => {
        const sourceLabel = img.source === 'mapillary' ? 'Mapillary' : 'Google';
        const sourceBadge = img.source === 'mapillary' 
            ? '<span style="background:#05CB63; color:white; padding:2px 6px; border-radius:3px; font-size:10px; font-weight:600; margin-left:6px;">Mapillary</span>'
            : '<span style="background:#4285F4; color:white; padding:2px 6px; border-radius:3px; font-size:10px; font-weight:600; margin-left:6px;">Google</span>';
        
        const dirEmoji = { 'North': '⬆️', 'South': '⬇️', 'East': '➡️', 'West': '⬅️' };
        
        return `
        <div class="streetview-card" style="cursor: pointer;">
            <img src="${img.thumbnail}" 
                 alt="${sourceLabel} street view" 
                 onclick="window.open('${img.url}', '_blank')"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22360%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22640%22 height=%22360%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23999%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-family=%22sans-serif%22%3EImage unavailable%3C/text%3E%3C/svg%3E'">
            <div class="streetview-info">
                <div class="streetview-distance">${dirEmoji[img.direction]} ${img.distance.toFixed(0)}m • ${Math.round(img.bearing)}° ${sourceBadge}</div>
                <div class="streetview-direction">${img.captured_at ? '📅 ' + new Date(img.captured_at).toLocaleDateString() : '📅 Date unknown'}</div>
            </div>
        </div>`;
    }).join('');
    
    html += '</div>';

    container.innerHTML = html;
}

/**
 * Load and display street view images for a kindergarten location
 */
async function loadStreetViewForKindergarten(lngLat) {
    // Show the street view section
    document.getElementById('streetViewResults').style.display = 'block';
    
    // Show loading state
    document.getElementById('streetViewContainer').innerHTML = `
        <div class="loading-streetview">
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🔄</div>
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">იტვირთება ქუჩის ფოტოები...</div>
            </div>
        </div>`;
    
    // Fetch images
    const images = await fetchCombinedStreetView([lngLat.lng, lngLat.lat]);
    
    // Sort and select the 5 closest images
    const selectedImages = images
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    
    // Display street view images
    displayStreetViewImages(selectedImages);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchGoogleStreetView,
        fetchMapillaryImages,
        fetchCombinedStreetView,
        displayStreetViewImages,
        loadStreetViewForKindergarten,
        calculateDistance,
        calculateBearing,
        getDirection,
        calculatePointAtDistance
    };
}