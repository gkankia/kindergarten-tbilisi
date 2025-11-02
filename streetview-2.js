// streetview.js - Google Street View & Mapillary Integration with Rule-Based Safety Analysis
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
 */
async function fetchGoogleStreetView(pinCoords) {
    try {
        console.log('Fetching Google Street View for location:', pinCoords);
        
        const searchPoints = [];
        const numPoints = 50;
        
        for (let i = 0; i < numPoints; i++) {
            const angle = Math.random() * 360;
            const dist = 10 + Math.random() * 90;
            
            const point = calculatePointAtDistance(pinCoords[1], pinCoords[0], dist, angle);
            searchPoints.push({ lat: point.lat, lng: point.lng, angle, dist });
        }

        console.log(`Searching ${searchPoints.length} random Google Street View points`);

        const promises = searchPoints.map(async point => {
            const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${point.lat},${point.lng}&radius=50&key=${GOOGLE_MAPS_API_KEY}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status === 'OK') {
                    const panoLat = data.location.lat;
                    const panoLng = data.location.lng;
                    const distance = calculateDistance(pinCoords[1], pinCoords[0], panoLat, panoLng);
                    
                    if (distance >= 10 && distance <= 100) {
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
                            url: `https://www.google.com/maps/@?api=1&map_action=pano&pano=${data.pano_id}`
                        };
                    }
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

        console.log(`Google: ${uniqueImages.length} unique panoramas in 10-100m range`);
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
 * Fetch road data from OpenStreetMap Overpass API
 * This provides detailed information about roads near the kindergarten
 */
async function fetchNearbyRoads(lat, lng, radiusMeters = 100) {
    try {
        const query = `
            [out:json];
            (
                way["highway"](around:${radiusMeters},${lat},${lng});
            );
            out body;
            >;
            out skel qt;
        `;
        
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        return data.elements || [];
    } catch (error) {
        console.error('Error fetching OSM data:', error);
        return [];
    }
}

/**
 * Analyze road safety based on OpenStreetMap data
 * This is completely free and uses open data
 */
function analyzeRoadSafety(osmElements, pinCoords) {
    const analysis = {
        roads: [],
        features: {
            hasTrafficLights: false,
            hasCrosswalk: false,
            hasSpeedBump: false,
            hasSidewalk: false,
            hasStreetLight: false,
            hasCycleway: false
        },
        risks: [],
        positives: []
    };
    
    // Analyze each road element
    osmElements.forEach(element => {
        if (element.type === 'way' && element.tags) {
            const tags = element.tags;
            const highway = tags.highway;
            
            if (highway) {
                const roadInfo = {
                    type: highway,
                    name: tags.name || 'უსახელო გზა',
                    maxspeed: tags.maxspeed,
                    lanes: tags.lanes,
                    surface: tags.surface,
                    sidewalk: tags.sidewalk,
                    cycleway: tags.cycleway,
                    lit: tags.lit
                };
                
                analysis.roads.push(roadInfo);
                
                // Check for positive features
                if (tags.sidewalk && tags.sidewalk !== 'no') {
                    analysis.features.hasSidewalk = true;
                }
                if (tags.cycleway) {
                    analysis.features.hasCycleway = true;
                }
                if (tags.lit === 'yes') {
                    analysis.features.hasStreetLight = true;
                }
                if (tags.crossing || highway === 'crossing') {
                    analysis.features.hasCrosswalk = true;
                }
                if (highway === 'traffic_signals') {
                    analysis.features.hasTrafficLights = true;
                }
                if (tags.traffic_calming === 'bump' || tags.traffic_calming === 'hump') {
                    analysis.features.hasSpeedBump = true;
                }
                
                // Identify risks
                const majorRoadTypes = ['motorway', 'trunk', 'primary', 'secondary'];
                if (majorRoadTypes.includes(highway)) {
                    analysis.risks.push({
                        type: 'major_road',
                        severity: 'high',
                        description: `დიდი გზა (${highway}) ახლოს არის`
                    });
                }
                
                if (tags.maxspeed) {
                    const speed = parseInt(tags.maxspeed);
                    if (speed > 50) {
                        analysis.risks.push({
                            type: 'high_speed',
                            severity: 'high',
                            description: `მაღალი სიჩქარის ზონა (${speed} კმ/სთ)`
                        });
                    }
                }
                
                if (tags.lanes && parseInt(tags.lanes) >= 4) {
                    analysis.risks.push({
                        type: 'multi_lane',
                        severity: 'medium',
                        description: `ფართო გზა (${tags.lanes} ზოლი)`
                    });
                }
                
                if (!tags.sidewalk || tags.sidewalk === 'no') {
                    analysis.risks.push({
                        type: 'no_sidewalk',
                        severity: 'high',
                        description: 'ტროტუარი არ არის'
                    });
                }
            }
        }
    });
    
    // Add positive features
    if (analysis.features.hasSidewalk) {
        analysis.positives.push('✅ ტროტუარი არსებობს');
    }
    if (analysis.features.hasCrosswalk) {
        analysis.positives.push('✅ გზის გადასასვლელი არის');
    }
    if (analysis.features.hasTrafficLights) {
        analysis.positives.push('✅ შუქნიშანი არსებობს');
    }
    if (analysis.features.hasSpeedBump) {
        analysis.positives.push('✅ სიჩქარის შემამცირებელი უზრუნველყოფილია');
    }
    if (analysis.features.hasStreetLight) {
        analysis.positives.push('✅ ქუჩის განათება კარგია');
    }
    if (analysis.features.hasCycleway) {
        analysis.positives.push('✅ ველოსიპედის ბილიკი არსებობს');
    }
    
    return analysis;
}

/**
 * Generate safety summary in Georgian - narrative style
 */
function generateSafetySummary(analysis) {
    let summary = '';
    
    // Overall assessment
    const highRisks = analysis.risks.filter(r => r.severity === 'high').length;
    const mediumRisks = analysis.risks.filter(r => r.severity === 'medium').length;
    const hasPositives = analysis.positives.length > 0;
    
    // Opening paragraph - overall assessment
    if (highRisks > 2) {
        summary += 'ამ საბავშვო ბაგის გარემო საკმაოდ პრობლემურია ბავშვთა უსაფრთხოების თვალსაზრისით. გარშემო არის მნიშვნელოვანი საფრთხეები, რომლებიც საჭიროებს სერიოზულ ყურადღებას. ';
    } else if (highRisks > 0) {
        summary += 'ბაგის მიმდებარე ტერიტორიაზე შეინიშნება გარკვეული უსაფრთხოების საკითხები, რომლებზეც ყურადღება უნდა მიექცეს. ';
    } else {
        summary += 'ბაგის გარშემო გარემო ზოგადად უსაფრთხოდ შეიძლება ჩაითვალოს ბავშვებისთვის. ';
    }
    
    // Describe positive features in natural language
    if (hasPositives) {
        const features = [];
        if (analysis.features.hasSidewalk) features.push('ტროტუარებია');
        if (analysis.features.hasCrosswalk) features.push('გზის გადასასვლელები');
        if (analysis.features.hasTrafficLights) features.push('შუქნიშნები');
        if (analysis.features.hasSpeedBump) features.push('სიჩქარის შემამცირებლები');
        if (analysis.features.hasStreetLight) features.push('სანათი ფარები');
        if (analysis.features.hasCycleway) features.push('ველოსიპედის ბილიკები');
        
        if (features.length > 0) {
            summary += 'დადებითი მხარე ისაა, რომ ტერიტორიაზე ';
            if (features.length === 1) {
                summary += `${features[0]} მოეწყობა. `;
            } else if (features.length === 2) {
                summary += `${features[0]} და ${features[1]} მოეწყობა. `;
            } else {
                const lastFeature = features.pop();
                summary += `${features.join(', ')} და ${lastFeature} მოეწყობა. `;
            }
        }
    }
    
    // Describe risks in narrative form
    if (analysis.risks.length > 0) {
        summary += '\n\n';
        const uniqueRisks = [...new Map(analysis.risks.map(r => [r.description, r])).values()];
        const majorRoads = uniqueRisks.filter(r => r.type === 'major_road');
        const highSpeed = uniqueRisks.filter(r => r.type === 'high_speed');
        const multiLane = uniqueRisks.filter(r => r.type === 'multi_lane');
        const noSidewalk = uniqueRisks.filter(r => r.type === 'no_sidewalk');
        
        if (majorRoads.length > 0 || highSpeed.length > 0) {
            summary += 'მთავარი საფრთხე ინტენსიური ტრაფიკია. ';
            if (majorRoads.length > 0) {
                summary += 'ბაგის სიახლოვეს გადის დიდი სატრანსპორტო მაგისტრალი, ';
            }
            if (highSpeed.length > 0) {
                summary += 'სადაც სიჩქარის ლიმიტი საკმაოდ მაღალია. ';
            }
        }
        
        if (multiLane.length > 0) {
            summary += 'გზა ფართოა, რამდენიმე ზოლიანი, რაც ბავშვისთვის გადაკვეთას ართულებს. ';
        }
        
        if (noSidewalk.length > 0) {
            summary += 'განსაკუთრებით პრობლემურია ის, რომ გარკვეულ მონაკვეთებზე ტროტუარები საერთოდ არ არის, რაც ბავშვებს აიძულებს საგზაო ნაწილზე სიარულს. ';
        }
    }
    
    // Recommendations in natural language
    summary += '\n\n';
    if (highRisks > 0) {
        summary += 'ამ პირობებში აუცილებელია, რომ ბავშვები მუდმივ ზედამხედველობაში იყვნენ. ';
        summary += 'გზის გადაკვეთისას განსაკუთრებული სიფრთხილეა საჭირო და სასურველია მხოლოდ გამორჩეულ გადასასვლელებზე გადასვლა. ';
        
        if (!analysis.features.hasSidewalk) {
            summary += 'მშობლებმა და ადმინისტრაციამ უნდა მოითხოვონ შესაბამისი უწყებებიდან ტროტუარის მოწყობა. ';
        }
        if (!analysis.features.hasTrafficLights) {
            summary += 'აგრეთვე სასურველია შუქნიშნების დამონტაჟება ბაგის სიახლოვეს, რაც უსაფრთხოების დონეს მნიშვნელოვნად გაზრდის. ';
        }
    } else {
        summary += 'მიუხედავად შედარებით უსაფრთხო გარემოსა, ბავშვებს მაინც სჭირდებათ ზედამხედველობა ქუჩაში გადაადგილებისას. ';
    }
    
    return summary;
}

/**
 * Display street view images in the sidebar (without safety analysis)
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
 * Display urban environment safety analysis in a separate section
 */
function displayUrbanEnvironmentAnalysis(safetyAnalysis) {
    const container = document.getElementById('urbanEnvironmentContainer');
    
    if (!container) {
        console.error('Urban environment container not found');
        return;
    }
    
    if (!safetyAnalysis || !safetyAnalysis.summary) {
        container.innerHTML = '<div style="padding: 16px; color: #666;">უსაფრთხოების ანალიზი არ არის ხელმისაწვდომი</div>';
        return;
    }
    
    container.innerHTML = `
        <div style="background: #f4f4f4); 
                    color: #666666; 
                    padding: 20px; 
                    border-radius: 12px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
            <div style="font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${safetyAnalysis.summary}</div>
        </div>`;
    
    // Update the count in the dropdown header if it exists
    const countElement = document.getElementById('urbanEnvironmentCount');
    if (countElement) {
        countElement.textContent = '1';
    }
}

/**
 * Load and display street view images with FREE safety analysis for a kindergarten location
 * Uses OpenStreetMap data - completely free!
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
    
    // Show urban environment section and loading state
    const urbanEnvSection = document.getElementById('urbanEnvironmentResults');
    if (urbanEnvSection) {
        urbanEnvSection.style.display = 'block';
        const urbanEnvContainer = document.getElementById('urbanEnvironmentContainer');
        if (urbanEnvContainer) {
            urbanEnvContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔄</div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">მიმდინარეობს უსაფრთხოების ანალიზი...</div>
                    <div style="font-size: 14px; color: #666;">OpenStreetMap მონაცემების დამუშავება</div>
                </div>`;
        }
    }
    
    // Fetch both images and OSM data in parallel
    const [images, osmElements] = await Promise.all([
        fetchCombinedStreetView([lngLat.lng, lngLat.lat]),
        fetchNearbyRoads(lngLat.lat, lngLat.lng, 100)
    ]);
    
    // Sort and select the 5 closest images
    const selectedImages = images
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    
    // Display street view images (without analysis)
    displayStreetViewImages(selectedImages);
    
    // Analyze road safety based on OSM data
    const analysis = analyzeRoadSafety(osmElements, [lngLat.lng, lngLat.lat]);
    const summary = generateSafetySummary(analysis);
    
    // Display urban environment analysis in separate section
    displayUrbanEnvironmentAnalysis({
        summary: summary
    });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchGoogleStreetView,
        fetchMapillaryImages,
        fetchCombinedStreetView,
        displayStreetViewImages,
        displayUrbanEnvironmentAnalysis,
        loadStreetViewForKindergarten,
        fetchNearbyRoads,
        analyzeRoadSafety,
        generateSafetySummary,
        calculateDistance,
        calculateBearing,
        getDirection,
        calculatePointAtDistance
    };
}