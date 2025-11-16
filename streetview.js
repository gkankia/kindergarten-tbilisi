// streetview.js - Mapillary Integration Only
// ============================================
// API KEY
// ============================================
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
 * Fetch Mapillary images around a pin location
 * Searches within ~250 m bounding box
 */
async function fetchMapillaryImages(pinCoords) {
    try {
        console.log('Fetching Mapillary images for location:', pinCoords);
        
        const bufferDegrees = 0.0025; // ≈250 m
        const bbox = [
            pinCoords[0] - bufferDegrees,
            pinCoords[1] - bufferDegrees,
            pinCoords[0] + bufferDegrees,
            pinCoords[1] + bufferDegrees
        ];
        
        const url = `https://graph.mapillary.com/images?access_token=${MAPILLARY_CLIENT_TOKEN}&fields=id,geometry,captured_at,thumb_1024_url,compass_angle&bbox=${bbox.join(',')}&limit=2000`;
        
        console.log('Mapillary bbox (250 m radius):', bbox);
        
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
        
        const distances = [50, 100, 150, 200, 250];
        
        const processedImages = data.data
            .map(img => {
                const imgLng = img.geometry.coordinates[0];
                const imgLat = img.geometry.coordinates[1];
                const distance = calculateDistance(pinCoords[1], pinCoords[0], imgLat, imgLng);
                const bearing = calculateBearing(pinCoords[1], pinCoords[0], imgLat, imgLng);
                const targetDistance = distances.reduce((prev, curr) => 
                    Math.abs(curr - distance) < Math.abs(prev - distance) ? curr : prev
                );
                
                return {
                    id: img.id,
                    source: 'mapillary',
                    distance,
                    bearing,
                    direction: getDirection(bearing),
                    thumbnail: img.thumb_1024_url,
                    coordinates: [imgLng, imgLat],
                    captured_at: img.captured_at,
                    compassAngle: img.compass_angle || 0,
                    url: `https://www.mapillary.com/app/?pKey=${img.id}`,
                    targetDistance
                };
            })
            .filter(img => img.distance >= 30 && img.distance <= 270);
        
        console.log(`Mapillary: ${processedImages.length} images in 50–250 m range`);
        
        return processedImages;
    } catch (error) {
        console.error('Error fetching Mapillary images:', error);
        return [];
    }
}

/**
 * Display street view (Mapillary) images in the sidebar
 */
function displayStreetViewImages(images) {
    const container = document.getElementById('streetViewContainer');
    
    if (images.length === 0) {
        container.innerHTML = '<div class="no-streetview">სამწუხაროდ, ვერ ვიპოვეთ ქუჩის ფოტოები ამ არეალში...</div>';
        return;
    }

    const dirEmoji = { 'North': '⬆️', 'South': '⬇️', 'East': '➡️', 'West': '⬅️' };
    
    const html = `
        <div class="streetview-images">
            ${images.map(img => `
                <div class="streetview-card" style="cursor: pointer;">
                    <img src="${img.thumbnail}" 
                         alt="Mapillary street view" 
                         onclick="window.open('${img.url}', '_blank')"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22360%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22640%22 height=%22360%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23999%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-family=%22sans-serif%22%3EImage unavailable%3C/text%3E%3C/svg%3E'">
                    <div class="streetview-info">
                        <div class="streetview-distance">${dirEmoji[img.direction]} ${img.distance.toFixed(0)} m • ${Math.round(img.bearing)}° 
                            <span style="background:#05CB63; color:white; padding:2px 6px; border-radius:3px; font-size:10px; font-weight:600; margin-left:6px;">Mapillary</span>
                        </div>
                        <div class="streetview-direction">${img.captured_at ? '📅 ' + new Date(img.captured_at).toLocaleDateString() : '📅 უცნობია'}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Load and display Mapillary images for a kindergarten location
 * Groups by 50–250 m ranges, ensures 30 m min separation
 */
async function loadStreetViewForKindergarten(lngLat) {
    const container = document.getElementById('streetViewContainer');
    document.getElementById('streetViewResults').style.display = 'block';
    
    container.innerHTML = `
        <div class="loading-streetview">
            <div class="loading-spinner"></div>
            <div style="font-size:12px; font-weight:600; margin-bottom:8px;">
                იტვირთება ქუჩის ფოტოები...
            </div>
            <div style="font-size:12px; color:#666;">
                50–250 მეტრის რადიუსში...
            </div>
        </div>`;

    const images = await fetchMapillaryImages([lngLat.lng, lngLat.lat]);
    images.sort((a, b) => a.distance - b.distance);

    const distanceRanges = [
        { min: 25, max: 75, target: 50 },
        { min: 75, max: 125, target: 100 },
        { min: 125, max: 175, target: 150 },
        { min: 175, max: 225, target: 200 },
        { min: 225, max: 275, target: 250 }
    ];

    let selectedImages = [];

    distanceRanges.forEach(range => {
        const candidates = images.filter(img => img.distance >= range.min && img.distance <= range.max);
        for (const c of candidates) {
            if (!selectedImages.some(sel => calculateDistance(sel.coordinates[1], sel.coordinates[0], c.coordinates[1], c.coordinates[0]) < 30)) {
                selectedImages.push(c);
                break;
            }
        }
    });

    if (selectedImages.length < 5) {
        for (const c of images) {
            if (selectedImages.length >= 5) break;
            if (!selectedImages.some(sel => calculateDistance(sel.coordinates[1], sel.coordinates[0], c.coordinates[1], c.coordinates[0]) < 30)) {
                selectedImages.push(c);
            }
        }
    }

    selectedImages.sort((a, b) => a.distance - b.distance);
    console.log(`Selected ${selectedImages.length} Mapillary images`);

    displayStreetViewImages(selectedImages);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchMapillaryImages,
        displayStreetViewImages,
        loadStreetViewForKindergarten,
        calculateDistance,
        calculateBearing,
        getDirection
    };
}