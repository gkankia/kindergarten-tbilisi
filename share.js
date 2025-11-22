// share.js - Map sharing and state management

// Track map state with kindergartens AND schools
let mapState = {
    lat: null,
    lng: null,
    zoom: null,
    bearing: null,
    pitch: null,
    tab: 'survey',
    mode: 'walking',
    time: '15',
    selectedLng: null,
    selectedLat: null,
    selectedName: null,
    selectedType: null, // 'kindergarten' or 'school'
    routeFrom: null,
    routeTo: null,
    hasRoute: false
};

// Initialize state tracking - call this after map is created
function initializeMapStateTracking(mapInstance) {
    mapInstance.on("moveend", () => {
        const center = mapInstance.getCenter();
        mapState.lat = center.lat.toFixed(6);
        mapState.lng = center.lng.toFixed(6);
        mapState.zoom = mapInstance.getZoom().toFixed(2);
        mapState.bearing = mapInstance.getBearing().toFixed(2);
        mapState.pitch = mapInstance.getPitch().toFixed(2);
    });
}

// Generate share url with kindergartens AND schools
function getShareUrl() {
    const params = new URLSearchParams();

    // Map view
    if (mapState.lat) params.set("lat", mapState.lat);
    if (mapState.lng) params.set("lng", mapState.lng);
    if (mapState.zoom) params.set("z", mapState.zoom);
    if (mapState.bearing) params.set("bearing", mapState.bearing);
    if (mapState.pitch) params.set("pitch", mapState.pitch);
    
    // Analysis state
    if (currentTab) params.set("tab", currentTab);
    if (resultsMode) params.set("mode", resultsMode);
    if (document.getElementById('timeResults')) {
        params.set("time", document.getElementById('timeResults').value);
    }
    
    // Selected location (kindergarten or school)
    if (currentSelectedKindergarten) {
        params.set("slng", currentSelectedKindergarten.lng.toFixed(6));
        params.set("slat", currentSelectedKindergarten.lat.toFixed(6));
        params.set("stype", "kindergarten"); // Update this logic to distinguish schools
    }
    if (currentSelectedKindergartenName) {
        params.set("sname", encodeURIComponent(currentSelectedKindergartenName));
    }

    // Route information - check for colored route layers
    const hasRoute = map.getLayer('route-line-colored') || 
                     map.getLayer('temp-route-line-colored');
    
    if (hasRoute) {
        params.set("showRoute", "true");
        
        // If user location is available, store it
        if (userLocation) {
            params.set("fromLng", userLocation[0].toFixed(6));
            params.set("fromLat", userLocation[1].toFixed(6));
        }
    }

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

// Apply state on page load - restore kindergartens/schools AND colored routes
function applyUrlState() {
    const params = new URLSearchParams(window.location.search);

    // Apply map position
    if (params.has("lat") && params.has("lng") && params.has("z")) {
        map.jumpTo({
            center: [parseFloat(params.get("lng")), parseFloat(params.get("lat"))],
            zoom: parseFloat(params.get("z")),
            bearing: params.has("bearing") ? parseFloat(params.get("bearing")) : 0,
            pitch: params.has("pitch") ? parseFloat(params.get("pitch")) : 0
        });
    }

    // Apply tab (automatically switch to results if shared from results)
    if (params.has("tab")) {
        const tab = params.get("tab");
        switchTab(tab);
    }

    // Apply mode
    if (params.has("mode")) {
        const mode = params.get("mode");
        setTimeout(() => setResultsMode(mode), 100);
    }

    // Apply time
    if (params.has("time")) {
        document.getElementById('timeResults').value = params.get("time");
    }

    // Apply selected location (kindergarten or school) and restore analysis
    if (params.has("slng") && params.has("slat")) {
        const slng = parseFloat(params.get("slng"));
        const slat = parseFloat(params.get("slat"));
        const sname = params.has("sname") ? decodeURIComponent(params.get("sname")) : null;
        const stype = params.get("stype") || "kindergarten";
        
        // Wait for map and data to load
        const restoreState = () => {
            // Check if appropriate data is loaded based on type
            const dataLoaded = (stype === "kindergarten" && kindergartenData && kindergartenData.features);
            
            if (!dataLoaded) {
                // Data not loaded yet, wait
                setTimeout(restoreState, 500);
                return;
            }
            
            currentSelectedKindergarten = { lng: slng, lat: slat };
            currentSelectedKindergartenName = sname;
            
            // Zoom to location and generate isochrone
            zoomToKindergarten({ lng: slng, lat: slat });
            
            // Restore colored route with accident density if it was shared
            if (params.has("showRoute")) {
                const mode = params.get("mode") || resultsMode;
                
                setTimeout(() => {
                    if (params.has("fromLng") && params.has("fromLat")) {
                        // Route from specific origin
                        const fromLng = parseFloat(params.get("fromLng"));
                        const fromLat = parseFloat(params.get("fromLat"));
                        showRoute([fromLng, fromLat], [slng, slat], mode, true);
                    } else {
                        // Route from user location
                        showRouteToSelected([slng, slat], mode, true);
                    }
                }, 2000); // Wait for isochrone and accident data to load
            }
        };
        
        if (map.loaded()) {
            setTimeout(restoreState, 1500);
        } else {
            map.once('idle', () => {
                setTimeout(restoreState, 1500);
            });
        }
    }
}

// Initialize share buttons
function initializeShareButtons() {
    // Facebook
    document.getElementById("fbShareBtn")?.addEventListener("click", () => {
        const url = encodeURIComponent(getShareUrl());
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
    });

    // LinkedIn
    document.getElementById("liShareBtn")?.addEventListener("click", () => {
        const url = encodeURIComponent(getShareUrl());
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer');
    });

    // Copy Link
    document.getElementById("copyLinkBtn")?.addEventListener("click", () => {
        const url = getShareUrl();
        navigator.clipboard.writeText(url).then(() => {
            const msg = document.getElementById("copyMessage");
            if (msg) {
                msg.style.display = "inline";
                setTimeout(() => { msg.style.display = "none"; }, 1500);
            }
        });
    });
}