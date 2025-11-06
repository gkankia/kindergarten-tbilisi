// ROUTE GENERATION AND SPATIAL ANALYSIS
        // FUNCTION TO ANALYZE ACCIDENT DENSITY ALONG ROUTE SEGMENTS

        function analyzeRouteAccidentDensity(routeGeometry, accidents, bufferDistance = 0.02) {
            const segments = [];
            const coords = routeGeometry.coordinates;

            for (let i = 0; i < coords.length - 1; i++) {
                const segmentLine = turf.lineString([coords[i], coords[i + 1]]);
                const buffer = turf.buffer(segmentLine, bufferDistance, { units: 'kilometers' });

                let segmentAccidents = 0;
                let segmentWeight = 0;

                accidents.forEach(accident => {
                    const point = turf.point(accident.geometry.coordinates);
                    if (turf.booleanPointInPolygon(point, buffer)) {
                        segmentAccidents++;
                        segmentWeight += accident.properties.weight || 1;
                    }
                });

                segments.push({
                    coordinates: [coords[i], coords[i + 1]],
                    accidentCount: segmentAccidents,
                    weightedCount: segmentWeight,
                    geometry: segmentLine.geometry
                });
            }

            return segments;
        }

        // Globals to track loading and aborting
        let currentRouteLoadingTimeout = null;
        let currentRouteController = null;
        let tempRoutePopup = null;

        // Updated showRoute with crash stats + popup + abortable fetch
        async function showRoute(from, to, mode, permanent = false) {
            const routeId = permanent ? 'route-line' : 'temp-route-line';
            const sourceId = permanent ? 'route-source' : 'temp-route';

            // Cancel previous request
            if (currentRouteController) currentRouteController.abort();
            currentRouteController = new AbortController();
            const { signal } = currentRouteController;

            if (currentRouteLoadingTimeout) clearTimeout(currentRouteLoadingTimeout);
            hideLoadingIndicator();

            // Show loader after 200ms only if route takes time
            currentRouteLoadingTimeout = setTimeout(() => showLoadingIndicator(), 200);

            // Remove temp layers
            if (!permanent) {
                if (map.getLayer(routeId + '-colored')) map.removeLayer(routeId + '-colored');
                if (map.getLayer(routeId + '-colored-outline')) map.removeLayer(routeId + '-colored-outline');
                if (map.getLayer(routeId + '-colored-outline-glow-middle')) map.removeLayer(routeId + '-colored-outline-glow-middle');
                if (map.getLayer(routeId + '-colored-outline-glow-outer')) map.removeLayer(routeId + '-colored-outline-glow-outer');
                if (map.getSource(sourceId + '-segments')) map.removeSource(sourceId + '-segments');
                if (tempRoutePopup) {
                    tempRoutePopup.remove();
                    tempRoutePopup = null;
                }
            }

            try {
                const response = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/${mode}/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&annotations=maxspeed&overview=full&access_token=${mapboxgl.accessToken}`,
                    { signal }
                );
                const data = await response.json();

                if (!signal.aborted) {
                    clearTimeout(currentRouteLoadingTimeout);
                    hideLoadingIndicator();
                } else return;

                const route = data.routes[0].geometry;
                const distance = data.routes[0].distance;
                const duration = data.routes[0].duration;

                const maxspeeds = data.routes[0].legs[0].annotation?.maxspeed || [];
                const numericSpeeds = maxspeeds.map(s => s?.speed || null).filter(v => v !== null);
                const avgCarSpeed = numericSpeeds.length ? numericSpeeds.reduce((a, b) => a + b, 0) / numericSpeeds.length : null;

                let accidents = typeof carAccidentData !== 'undefined' && carAccidentData.features ? carAccidentData.features : [];
                const segments = analyzeRouteAccidentDensity(route, accidents);

                // Prepare segment source and layers
                const segmentFeatures = segments.map(seg => ({
                    type: 'Feature',
                    geometry: seg.geometry,
                    properties: { accidentCount: seg.accidentCount, weightedCount: seg.weightedCount }
                }));
                const segmentCollection = { type: 'FeatureCollection', features: segmentFeatures };
                const segmentSourceId = `${routeId}-segments`;
                const coloredLayerId = `${routeId}-colored`;
                const outlineLayerId = `${routeId}-colored-outline`;

                if (map.getLayer(`${outlineLayerId}-glow-outer`)) map.removeLayer(`${outlineLayerId}-glow-outer`);
                if (map.getLayer(`${outlineLayerId}-glow-middle`)) map.removeLayer(`${outlineLayerId}-glow-middle`);
                if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
                if (map.getLayer(coloredLayerId)) map.removeLayer(coloredLayerId);
                if (map.getSource(segmentSourceId)) map.removeSource(segmentSourceId);

                map.addSource(segmentSourceId, { type: 'geojson', data: segmentCollection });
                // Outer glow layer (widest, most transparent)
                map.addLayer({
                    id: `${outlineLayerId}-glow-outer`, type: 'line', source: segmentSourceId,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 
                        'line-color': ['interpolate', ['linear'], ['get', 'weightedCount'],
                            0, '#22c55e', 1, '#84cc16', 2, '#eab308', 4, '#f59e0b', 6, '#ef4444', 10, '#dc2626'],
                        'line-width': permanent ? 18 : 14, 
                        'line-opacity': 0,
                        'line-blur': 8
                    }
                });

                // Middle glow layer
                map.addLayer({
                    id: `${outlineLayerId}-glow-middle`, type: 'line', source: segmentSourceId,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 
                        'line-color': ['interpolate', ['linear'], ['get', 'weightedCount'],
                            0, '#22c55e', 1, '#84cc16', 2, '#eab308', 4, '#f59e0b', 6, '#ef4444', 10, '#dc2626'],
                        'line-width': permanent ? 12 : 10, 
                        'line-opacity': 0,
                        'line-blur': 4
                    }
                });

                // Main colored line
                map.addLayer({
                    id: coloredLayerId, type: 'line', source: segmentSourceId,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': ['interpolate', ['linear'], ['get', 'weightedCount'],
                            0, '#22c55e', 1, '#84cc16', 2, '#eab308', 4, '#f59e0b', 6, '#ef4444', 10, '#dc2626'],
                        'line-width': permanent ? 6 : 4, 'line-opacity': 0
                    }
                });

                                // Fade in route layers
                let opacity = 0;
                const fadeIn = () => {
                    opacity += 0.05;
                    if (opacity > 1) opacity = 1;
                    map.setPaintProperty(`${outlineLayerId}-glow-outer`, 'line-opacity', opacity * 0.15);
                    map.setPaintProperty(`${outlineLayerId}-glow-middle`, 'line-opacity', opacity * 0.3);
                    map.setPaintProperty(outlineLayerId, 'line-opacity', opacity * 0.8);
                    map.setPaintProperty(coloredLayerId, 'line-opacity', opacity);
                    if (opacity < 1) requestAnimationFrame(fadeIn);
                };
                fadeIn();

                // Fit bounds
                const routeBounds = route.coordinates.reduce(
                    (b, c) => b.extend(c),
                    new mapboxgl.LngLatBounds(route.coordinates[0], route.coordinates[0])
                );
                map.fitBounds(routeBounds, { padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 1000, bearing: 0, pitch: 60 });

                // === Crash statistics + popup logic ===
                let lightCrashes = 0, severeCrashes = 0;
                if (typeof carAccidentData !== 'undefined' && carAccidentData.features) {
                    const buffer = turf.buffer({ type: 'Feature', geometry: route }, 0.02, { units: 'kilometers' });
                    carAccidentData.features.forEach(f => {
                        if (turf.booleanPointInPolygon(f, buffer)) {
                            if (f.properties.category === 'მძიმე') severeCrashes++;
                            else lightCrashes++;
                        }
                    });
                }

                const routeKm = distance / 1000 || 1;
                let severeCrashProb = severeCrashes / routeKm;
                if (avgCarSpeed !== null) severeCrashProb *= Math.pow(avgCarSpeed / 30, 1.2);

                const modeTranslation = { walking: 'ფეხით', driving: 'მანქანით', cycling: 'ველოსიპედით' };
                const translatedMode = modeTranslation[mode] || mode;

                let speedMessage = '';
                if (avgCarSpeed !== null) {
                    const speedText = `${avgCarSpeed.toFixed(1)} კმ/სთ`;
                    if (avgCarSpeed <= 30) speedMessage = `ამ მონაკვეთზე, მძღოლები, შედარებით ნელა - <span style="background-color: rgba(0,128,0,0.8); color:#fff; padding:2px 4px; border-radius:4px;">${speedText}</span> მოძრაობენ, რაც ნაკლებად საფრთხის შემცველია ბავშვისთვის ${translatedMode} გადაადგილებისას.`;
                    else if (avgCarSpeed <= 50) speedMessage = `აღნიშნულ მარშრუტზე, მძღოლები, საშუალოდ <span style="background-color: rgba(255,165,0,0.8); color:#fff; padding:2px 4px; border-radius:4px;">${speedText} სიჩქარით</span> გადაადგილდებიან. არსებობს მომეტებული საფრთხე აქ ბავშვთან ერთად ${translatedMode} გადაადგილებისას.`;
                    else speedMessage = `ეს მონაკვეთი გამოირჩევა განსაკუთრებით სახიფათო საავტომობილო მოძრაობითა და მაღალი სიჩქარით <span style="background-color: rgba(255,0,0,0.8); color:#fff; padding:2px 4px; border-radius:4px;">${speedText}</span> შეადგენს. ეს გარემოება არასახარბიელო პირობებს ქმნის ბავშვთან ერთად ${translatedMode} გადაადგილებისას.`;
                } else speedMessage = '<span style="color:gray;">სიჩქარის მონაცემი მიუწვდომელია</span>';

                const getProbColor = prob => prob <= 0.1 ? 'rgba(0,128,0,0.8)' : prob <= 0.3 ? 'rgba(255,165,0,0.8)' : 'rgba(255,0,0,0.8)';

                let severeCrashMessage;
                if (severeCrashes === 0) severeCrashMessage = `ამ არეალში, გასულ წელს, მძიმე შემთხვევები, სხეულის დაზიანებით, არ დაფიქსირებულა.`;
                else if (severeCrashProb === 0) severeCrashMessage = `<span style="color:gray;">მონაცემები არასაკმარისია მძიმე შემთხვევების ალბათობის შეფასებისთვის.</span>`;
                else severeCrashMessage = `ამ არეალში, გასულ წელს, <span style="background-color: rgba(255,0,0,0.8); color:#fff; padding:2px 4px; border-radius:4px;"><b>${severeCrashes}</b></span> შემთხვევა დაფიქსირდა, სხეულის დაზიანებით. მძიმე შემთხვევების განმეორების ალბათობა <span style="background-color: ${getProbColor(severeCrashProb)}; color:#fff; padding:2px 4px; border-radius:4px;">${severeCrashProb.toFixed(2)}</span> შეადგენს ყოველ ერთ კილომეტრზე.`;

                if (!permanent) {
                    const distanceKm = (distance / 1000).toFixed(1);
                    const durationMin = Math.round(duration / 60);

                    let dangerousLength = 0, currentDangerousStretch = 0, longestDangerousStretch = 0;
                    segments.forEach(seg => {
                        const len = turf.length(turf.lineString(seg.coordinates), { units: 'meters' });
                        if (seg.weightedCount >= 4) {
                            dangerousLength += len;
                            currentDangerousStretch += len;
                            if (currentDangerousStretch > longestDangerousStretch) longestDangerousStretch = currentDangerousStretch;
                        } else currentDangerousStretch = 0;
                    });
                    const dangerousKm = (dangerousLength / 1000).toFixed(2);
                    const dangerousPercent = ((dangerousLength / distance) * 100).toFixed(1);
                    const longestStretchKm = (longestDangerousStretch / 1000).toFixed(2);

                    const dangerousStretchMessage = dangerousLength > 0
                        ? `<div style="margin-top:10px; padding:8px; background: rgba(239,68,68,0.2); border-radius:4px; border-left:3px solid #ef4444;">
                            <div style="font-size:11px; font-weight:bold; margin-bottom:4px;">⚠️ სახიფათო მონაკვეთები</div>
                            <div style="font-size:10px;">• სულ: <b>${dangerousKm} კმ</b> (მარშრუტის <b>${dangerousPercent}%<b>)<br>• უგრძესი მონაკვეთი: <b>${longestStretchKm} კმ</b></div>
                        </div>`
                        : `<div style="margin-top:10px; padding:8px; background: rgba(34,197,94,0.2); border-radius:4px; border-left:3px solid #22c55e;">
                            <div style="font-size:11px;">✓ მარშრუტი შედარებით უსაფრთხოა</div>
                        </div>`;

                    const colorBarLegend = `<div style="margin-top:12px; padding:10px; border-radius:4px;">
                        <div style="display:flex; height:10px; overflow:hidden; margin-bottom:6px;">
                            <div style="flex:1; background:#22c55e;"></div>
                            <div style="flex:1; background:#84cc16;"></div>
                            <div style="flex:1; background:#eab308;"></div>
                            <div style="flex:1; background:#f59e0b;"></div>
                            <div style="flex:1; background:#ef4444;"></div>
                            <div style="flex:1; background:#dc2626;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:9px;"><span>უსაფრთხო</span><span>სახიფათო</span></div>
                    </div>`;

                    let routePopupDiv = document.getElementById('routePopup');
                    if (!routePopupDiv) {
                        routePopupDiv = document.createElement('div');
                        routePopupDiv.id = 'routePopup';
                        Object.assign(routePopupDiv.style, {
                            display:'block', position:'absolute', top:'10px', right:'50px',
                            background:'rgba(58,111,161,0.193)', color:'#fff', backdropFilter:'blur(2px)',
                            padding:'15px', borderRadius:'8px', fontFamily:"'JetBrains Mono', monospace",
                            lineHeight:'1.25rem', boxShadow:'0 0 30px 0 rgba(255,255,255,0.25)', maxWidth:'320px', zIndex:'999'
                        });
                        map.getContainer().appendChild(routePopupDiv);
                    } else routePopupDiv.style.display = 'block';

                    routePopupDiv.innerHTML = `
                        <div id="routePopupContent">
                            <div>ამ მანძილის <b>(${distanceKm} კმ)</b> ${translatedMode} გავლას, <b>${durationMin}</b> წთ დასჭირდება. ${speedMessage}</div>
                            <div style="margin-top:8px;">${severeCrashMessage}</div>
                            ${dangerousStretchMessage}
                            ${colorBarLegend}
                        </div>
                        <div style="display:flex; justify-content:center; margin-top:8px;">
                            <button id="routePopupToggle" style="background:rgba(0,0,0,0); color:#fff; border:none; border-radius:3px; padding:2px 6px; cursor:pointer; font-size:12px;">▲</button>
                        </div>
                    `;

                    const toggleBtn = document.getElementById('routePopupToggle');
                    const popupContent = document.getElementById('routePopupContent');
                    toggleBtn.onclick = () => {
                        popupContent.style.display = popupContent.style.display === 'none' ? 'block' : 'none';
                        toggleBtn.textContent = popupContent.style.display === 'none' ? '▼' : '▲';
                    };
                }

            } catch (error) {
                if (currentRouteLoadingTimeout) clearTimeout(currentRouteLoadingTimeout);
                hideLoadingIndicator();
                if (error.name !== 'AbortError') console.error('Error generating route:', error);
            }
        }

        // Loading indicator functions
        function showLoadingIndicator() {
            hideLoadingIndicator();

            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'routeLoadingIndicator';
            Object.assign(loadingDiv.style, {
                position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                background:'rgba(58,111,161,0.95)', color:'#fff', backdropFilter:'blur(5px)',
                padding:'20px 40px', borderRadius:'10px', fontFamily:"'JetBrains Mono', monospace",
                fontSize:'14px', boxShadow:'0 0 30px 0 rgba(255,255,255,0.25)', zIndex:'10000',
                display:'flex', alignItems:'center', gap:'15px'
            });

            loadingDiv.innerHTML = `
                <div style="width:20px;height:20px;border:3px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <span>მარშრუტის გენერაცია...</span>
                <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
            `;
            document.body.appendChild(loadingDiv);
        }

        function hideLoadingIndicator() {
            const loadingDiv = document.getElementById('routeLoadingIndicator');
            if (loadingDiv) {
                loadingDiv.style.opacity = '0';
                setTimeout(() => loadingDiv.remove(), 300);
            }
        }

        // --- ROUTE FROM USER TO SELECTED POINT ---
        function showRouteToSelected(destinationCoords, mode = 'walking', permanent = false) {
            // If userLocation already known from geolocate control
            if (userLocation) {
                showRoute(userLocation, destinationCoords, mode, permanent);
                return;
            }

            // Otherwise fallback to browser geolocation
            if (!navigator.geolocation) {
                alert("Geolocation is not supported by your browser");
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    const userCoords = [position.coords.longitude, position.coords.latitude];
                    userLocation = userCoords; // Save for reuse
                    showRoute(userCoords, destinationCoords, mode, permanent);
                },
                error => {
                    console.warn("Geolocation failed:", error.message);
                    alert("Couldn't get your location.");
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }

        async function loadKindergartenData() {
            try {
                const response = await fetch('https://raw.githubusercontent.com/gkankia/kindergarten-tbilisi/main/kindergartens_tbilisi_1.geojson');
                if (!response.ok) throw new Error('Network response was not ok');
                kindergartenData = await response.json();
                allKindergartenFeatures = kindergartenData.features.slice();
                if (map.getSource('kindergartens')) {
                    map.getSource('kindergartens').setData(kindergartenData);
                }
            } catch (err) {
                console.error('Failed to load kindergarten data:', err);
            }
        }