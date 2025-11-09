// playground-analysis.js - Playground Data & Safety Analysis using OpenStreetMap
// ============================================
// Fetches playground data from Overpass API and analyzes safety features
// ============================================

/**
 * Fetch playground and recreational data from OpenStreetMap Overpass API
 * This provides detailed information about playgrounds near the kindergarten
 */
async function fetchNearbyPlaygrounds(lat, lng, radiusMeters = 500) {
    try {
        const query = `
            [out:json];
            (
                way["leisure"="playground"](around:${radiusMeters},${lat},${lng});
                node["leisure"="playground"](around:${radiusMeters},${lat},${lng});
                way["leisure"="park"](around:${radiusMeters},${lat},${lng});
                node["playground"](around:${radiusMeters},${lat},${lng});
                way["amenity"="kindergarten"]["playground"="yes"](around:${radiusMeters},${lat},${lng});
            );
            out body;
            >;
            out skel qt;
        `;
        
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        console.log('Fetching playground data from Overpass API...');
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Overpass API response:', data);
        return data.elements || [];
    } catch (error) {
        console.error('Error fetching OSM playground data:', error);
        return [];
    }
}

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
 * Get center point of a way (polygon/line)
 */
function getWayCenter(way, allElements) {
    if (!way.nodes || way.nodes.length === 0) return null;
    
    const nodes = way.nodes
        .map(nodeId => allElements.find(el => el.id === nodeId && el.type === 'node'))
        .filter(node => node && node.lat && node.lon);
    
    if (nodes.length === 0) return null;
    
    const avgLat = nodes.reduce((sum, node) => sum + node.lat, 0) / nodes.length;
    const avgLon = nodes.reduce((sum, node) => sum + node.lon, 0) / nodes.length;
    
    return { lat: avgLat, lon: avgLon };
}

/**
 * Analyze playground richness and safety features
 */
function analyzePlaygroundFeatures(playground) {
    const tags = playground.tags || {};
    const features = {
        // Equipment richness
        hasSwing: tags.playground === 'swing' || tags['playground:swing'] === 'yes',
        hasSlide: tags.playground === 'slide' || tags['playground:slide'] === 'yes',
        hasClimbingFrame: tags.playground === 'climbingframe' || tags['playground:climbing_frame'] === 'yes',
        hasSandbox: tags.playground === 'sandpit' || tags['playground:sandpit'] === 'yes',
        hasSeesaw: tags.playground === 'seesaw' || tags['playground:seesaw'] === 'yes',
        hasSpringRider: tags.playground === 'springy' || tags['playground:springy'] === 'yes',
        hasStructure: tags.playground === 'structure',
        
        // Safety features
        hasFence: tags.barrier === 'fence' || tags.fence === 'yes',
        hasSurface: !!tags.surface,
        safeSurface: ['sand', 'grass', 'woodchips', 'rubber', 'tartan'].includes(tags.surface),
        hasLighting: tags.lit === 'yes',
        hasSeating: tags.bench === 'yes' || tags.amenity === 'bench',
        hasShelter: tags.shelter === 'yes' || tags.covered === 'yes',
        hasToilet: tags.toilets === 'yes' || tags.amenity === 'toilets',
        hasWater: tags.drinking_water === 'yes' || tags.amenity === 'drinking_water',
        
        // Accessibility
        wheelchairAccessible: tags.wheelchair === 'yes',
        
        // Age appropriateness
        minAge: tags.min_age ? parseInt(tags.min_age) : null,
        maxAge: tags.max_age ? parseInt(tags.max_age) : null,
        babyFriendly: tags['playground:baby'] === 'yes' || tags.min_age === '0',
        
        // Additional info
        name: tags.name,
        operator: tags.operator,
        access: tags.access || 'public',
        surface: tags.surface,
        description: tags.description
    };
    
    return features;
}

/**
 * Calculate playground richness score (0-100)
 */
function calculatePlaygroundScore(features) {
    let score = 0;
    const maxScore = 100;
    
    // Equipment variety (40 points max)
    const equipmentItems = [
        features.hasSwing,
        features.hasSlide,
        features.hasClimbingFrame,
        features.hasSandbox,
        features.hasSeesaw,
        features.hasSpringRider,
        features.hasStructure
    ];
    const equipmentCount = equipmentItems.filter(item => item).length;
    score += (equipmentCount / equipmentItems.length) * 40;
    
    // Safety features (40 points max)
    const safetyItems = [
        features.hasFence,
        features.safeSurface,
        features.hasLighting,
        features.hasSeating
    ];
    const safetyCount = safetyItems.filter(item => item).length;
    score += (safetyCount / safetyItems.length) * 40;
    
    // Amenities (20 points max)
    const amenityItems = [
        features.hasShelter,
        features.hasToilet,
        features.hasWater,
        features.wheelchairAccessible
    ];
    const amenityCount = amenityItems.filter(item => item).length;
    score += (amenityCount / amenityItems.length) * 20;
    
    return Math.round(score);
}

/**
 * Generate Georgian language playground description
 */
function generatePlaygroundDescription(playground, features, score, distance) {
    let description = '';
    
    // Header with name and distance
    const name = features.name || 'სათამაშო მოედანი';
    description += `<div style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #2c3e50;">${name}</div>`;
    description += `<div style="font-size: 13px; color: #7f8c8d; margin-bottom: 12px;">📍 ${distance.toFixed(0)} მეტრის დაშორებით</div>`;
    
    // Score badge
    let scoreColor = '#ef4444'; // red
    let scoreLabel = 'საჭიროებს გაუმჯობესებას';
    if (score >= 70) {
        scoreColor = '#22c55e'; // green
        scoreLabel = 'ძალიან კარგი';
    } else if (score >= 40) {
        scoreColor = '#f59e0b'; // orange
        scoreLabel = 'საშუალო';
    }
    
    description += `<div style="display: inline-block; background: ${scoreColor}; color: white; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">${scoreLabel} - ${score}/100</div>`;
    
    // Equipment section
    const equipment = [];
    if (features.hasSwing) equipment.push('🎡 საქანელა');
    if (features.hasSlide) equipment.push('🛝 სრიალი');
    if (features.hasClimbingFrame) equipment.push('🧗 ასასვლელი');
    if (features.hasSandbox) equipment.push('🏖️ ქვიშის ყუთი');
    if (features.hasSeesaw) equipment.push('⚖️ საქანელა-სალესო');
    if (features.hasSpringRider) equipment.push('🦄 საზამთრო');
    if (features.hasStructure) equipment.push('🏰 სათამაშო კომპლექსი');
    
    if (equipment.length > 0) {
        description += `<div style="margin-top: 12px; padding: 10px; background: #f0f9ff; border-radius: 6px;">`;
        description += `<div style="font-size: 12px; font-weight: 600; color: #0369a1; margin-bottom: 6px;">🎮 ინვენტარი:</div>`;
        description += `<div style="font-size: 11px; color: #0c4a6e;">${equipment.join(', ')}</div>`;
        description += `</div>`;
    } else {
        description += `<div style="margin-top: 12px; padding: 10px; background: #fef3c7; border-radius: 6px;">`;
        description += `<div style="font-size: 11px; color: #92400e;">⚠️ ინვენტარის შესახებ დეტალური ინფორმაცია არ არის</div>`;
        description += `</div>`;
    }
    
    // Safety features
    const safety = [];
    if (features.hasFence) safety.push('✅ ღობე არსებობს');
    if (features.safeSurface) safety.push(`✅ უსაფრთხო საფარი (${features.surface})`);
    else if (features.hasSurface) safety.push(`⚠️ საფარი: ${features.surface}`);
    if (features.hasLighting) safety.push('✅ განათება');
    if (features.hasSeating) safety.push('✅ ლავკები');
    
    if (safety.length > 0) {
        description += `<div style="margin-top: 12px; padding: 10px; background: #f0fdf4; border-radius: 6px;">`;
        description += `<div style="font-size: 12px; font-weight: 600; color: #166534; margin-bottom: 6px;">🛡️ უსაფრთხოება:</div>`;
        description += `<div style="font-size: 11px; color: #14532d;">${safety.join('<br>')}</div>`;
        description += `</div>`;
    }
    
    // Amenities
    const amenities = [];
    if (features.hasShelter) amenities.push('☂️ სახურავი');
    if (features.hasToilet) amenities.push('🚻 ტუალეტი');
    if (features.hasWater) amenities.push('💧 სასმელი წყალი');
    if (features.wheelchairAccessible) amenities.push('♿ ხელმისაწვდომი');
    
    if (amenities.length > 0) {
        description += `<div style="margin-top: 12px; padding: 10px; background: #faf5ff; border-radius: 6px;">`;
        description += `<div style="font-size: 12px; font-weight: 600; color: #6b21a8; margin-bottom: 6px;">🎯 დამატებითი:</div>`;
        description += `<div style="font-size: 11px; color: #581c87;">${amenities.join(', ')}</div>`;
        description += `</div>`;
    }
    
    // Age range
    if (features.minAge || features.maxAge || features.babyFriendly) {
        description += `<div style="margin-top: 12px; padding: 10px; background: #fef9c3; border-radius: 6px;">`;
        description += `<div style="font-size: 12px; font-weight: 600; color: #854d0e; margin-bottom: 4px;">👶 ასაკობრივი:</div>`;
        if (features.babyFriendly) {
            description += `<div style="font-size: 11px; color: #713f12;">✅ ჩვილებისთვის შესაფერისი</div>`;
        }
        if (features.minAge || features.maxAge) {
            const ageRange = features.minAge && features.maxAge 
                ? `${features.minAge}-${features.maxAge} წელი` 
                : features.minAge 
                ? `${features.minAge}+ წელი` 
                : `${features.maxAge} წლამდე`;
            description += `<div style="font-size: 11px; color: #713f12;">ასაკი: ${ageRange}</div>`;
        }
        description += `</div>`;
    }
    
    // Access info
    if (features.access !== 'public') {
        description += `<div style="margin-top: 12px; padding: 8px; background: #fee; border-left: 3px solid #ef4444; border-radius: 4px;">`;
        description += `<div style="font-size: 11px; color: #991b1b;">⚠️ წვდომა: ${features.access === 'private' ? 'პირადი' : features.access}</div>`;
        description += `</div>`;
    }
    
    return description;
}

/**
 * Analyze all playgrounds and generate summary report
 
function analyzePlaygrounds(osmElements, pinCoords) {
    const playgrounds = [];
    
    // Process each element
    osmElements.forEach(element => {
        if (element.tags && (element.tags.leisure === 'playground' || element.tags.playground)) {
            let lat, lon;
            
            // Get coordinates based on element type
            if (element.type === 'node') {
                lat = element.lat;
                lon = element.lon;
            } else if (element.type === 'way') {
                const center = getWayCenter(element, osmElements);
                if (!center) return;
                lat = center.lat;
                lon = center.lon;
            } else {
                return;
            }
            
            // Calculate distance from kindergarten
            const distance = calculateDistance(pinCoords[1], pinCoords[0], lat, lon);
            
            // Analyze features
            const features = analyzePlaygroundFeatures(element);
            const score = calculatePlaygroundScore(features);
            
            playgrounds.push({
                id: element.id,
                type: element.type,
                lat: lat,
                lon: lon,
                distance: distance,
                features: features,
                score: score,
                tags: element.tags
            });
        }
    });
    
    // Sort by distance
    playgrounds.sort((a, b) => a.distance - b.distance);
    
    return playgrounds;
}
*/
/**
 * Generate overall playground summary in Georgian
 */
function generatePlaygroundSummary(playgrounds) {
    if (playgrounds.length === 0) {
        return 'სამწუხაროდ, ამ რადიუსში სათამაშო მოედნები არ მოიძებნა OpenStreetMap-ის მონაცემებში. ეს შეიძლება ნიშნავდეს, რომ ისინი ჯერ არ არის დამატებული რუკაზე.';
    }
    
    let summary = '';
    
    // Overall statistics
    const avgScore = Math.round(playgrounds.reduce((sum, p) => sum + p.score, 0) / playgrounds.length);
    const closestPlayground = playgrounds[0];
    const excellentPlaygrounds = playgrounds.filter(p => p.score >= 70).length;
    
    summary += `<div style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #1e293b;">📊 საერთო მიმოხილვა</div>`;
    
    summary += `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 10px; margin-bottom: 16px;">`;
    summary += `<div style="font-size: 13px; margin-bottom: 8px;">500 მეტრის რადიუსში მოიძებნა <strong>${playgrounds.length}</strong> სათამაშო მოედანი</div>`;
    summary += `<div style="font-size: 13px; margin-bottom: 8px;">უახლოესი მოედანი: <strong>${closestPlayground.distance.toFixed(0)}</strong> მეტრი</div>`;
    summary += `<div style="font-size: 13px;">საშუალო შეფასება: <strong>${avgScore}/100</strong></div>`;
    summary += `</div>`;
    
    // Quality assessment
    if (excellentPlaygrounds > 0) {
        summary += `<div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; border-radius: 6px; margin-bottom: 16px;">`;
        summary += `<div style="font-size: 12px; color: #065f46;">✨ ${excellentPlaygrounds} მოედანი შეფასებულია როგორც "ძალიან კარგი"</div>`;
        summary += `</div>`;
    }
    
    if (avgScore < 40) {
        summary += `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 6px; margin-bottom: 16px;">`;
        summary += `<div style="font-size: 12px; color: #991b1b;">⚠️ უმეტესობა მოედნები საჭიროებს გაუმჯობესებას უსაფრთხოებისა და ინვენტარის თვალსაზრისით</div>`;
        summary += `</div>`;
    } else if (avgScore >= 70) {
        summary += `<div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; border-radius: 6px; margin-bottom: 16px;">`;
        summary += `<div style="font-size: 12px; color: #065f46;">✅ ზოგადად, მოედნები კარგ მდგომარეობაშია და უსაფრთხოა ბავშვებისთვის</div>`;
        summary += `</div>`;
    }
    
    return summary;
}

/**
 * Display playground analysis in the Urban Environment section
 */
function displayUrbanEnvironmentAnalysis(playgrounds, summary) {
    const container = document.getElementById('urbanEnvironmentContainer');
    
    if (!container) {
        console.error('Urban Environment container not found');
        return;
    }
    
    let html = '';
    
    // Add summary
    html += `<div style="padding: 16px;">${summary}</div>`;
    
    // Add individual playground cards
    if (playgrounds.length > 0) {
        html += `<div style="padding: 0 16px 16px 16px;">`;
        html += `<div style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #1e293b;">🎪 მოედნების დეტალები</div>`;
        
        playgrounds.forEach((playground, index) => {
            const description = generatePlaygroundDescription(
                playground,
                playground.features,
                playground.score,
                playground.distance
            );
            
            html += `<div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">`;
            html += description;
            html += `</div>`;
        });
        
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

/**
 * Load and display playground analysis for a kindergarten location
 * This will populate the Urban Environment section
 */
async function loadUrbanEnvironmentAnalysis(lngLat) {
    // Show the urban environment section
    const urbanEnvSection = document.getElementById('urbanEnvironmentResults');
    if (urbanEnvSection) {
        urbanEnvSection.style.display = 'block';
    }
    
    // Show loading state
    const container = document.getElementById('urbanEnvironmentContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🎡</div>
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">იტვირთება სათამაშო მოედნების მონაცემები...</div>
                <div style="font-size: 14px; color: #666;">OpenStreetMap-იდან</div>
            </div>`;
    }
    
    // Fetch playground data
    const osmElements = await fetchNearbyPlaygrounds(lngLat.lat, lngLat.lng, 500);
    
    // Analyze playgrounds
    const playgrounds = analyzePlaygrounds(osmElements, [lngLat.lng, lngLat.lat]);
    const summary = generatePlaygroundSummary(playgrounds);
    
    // Display results in Urban Environment section
    displayUrbanEnvironmentAnalysis(playgrounds, summary);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchNearbyPlaygrounds,
        analyzePlaygroundFeatures,
        calculatePlaygroundScore,
        analyzePlaygrounds,
        generatePlaygroundDescription,
        generatePlaygroundSummary,
        displayUrbanEnvironmentAnalysis,
        loadUrbanEnvironmentAnalysis,
        calculateDistance,
        getWayCenter
    };
}