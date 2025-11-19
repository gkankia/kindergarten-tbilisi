 // LOAD AND FILTER CAR ACCIDENTS DATA WITHIN ISOCHRONE
        
        async function loadCarAccidentData() {
            try {
                const response = await fetch('https://raw.githubusercontent.com/axis-Z/urbanyxv1/main/data/car_crashes.geojson');
                if (!response.ok) throw new Error('Network response was not ok');
                carAccidentData = await response.json();
                
                // Map crash_type to Georgian categories and add weight property
                carAccidentData.features = carAccidentData.features.map(feature => {
                    const crashType = feature.properties.crash_type;
                    let category = 'მსუბუქი'; // default to soft
                    let weight = 1; // default weight
                    
                    if (crashType === 'injury') {
                        category = 'მძიმე';
                        weight = 2; // Injuries get higher weight in heatmap
                    } else if (crashType === 'soft') {
                        category = 'მსუბუქი';
                        weight = 1;
                    }
                    
                    return {
                        ...feature,
                        properties: {
                            ...feature.properties,
                            category: category,
                            weight: weight
                        }
                    };
                });
                
                if (map.getSource('car-accidents')) {
                    map.getSource('car-accidents').setData(carAccidentData);
                }
                
                console.log('Loaded', carAccidentData.features.length, 'car accidents');
            } catch (err) {
                console.error('Failed to load car accident data:', err);
            }
        }

        function updateAccidentsLayer(isochronePolygon) {
            const accidentsInIsochrone = filterAccidentsByIsochrone(isochronePolygon);
            const geoJSON = { type: 'FeatureCollection', features: accidentsInIsochrone };
            
            if (map.getSource('isochrone-accidents')) {
                map.getSource('isochrone-accidents').setData(geoJSON);
            } else {
                map.addSource('isochrone-accidents', { type: 'geojson', data: geoJSON });
                
                /*
                // Add heatmap layer
                map.addLayer({
                    id: 'isochrone-accidents-heatmap',
                    type: 'heatmap',
                    source: 'isochrone-accidents',
                    maxzoom: 17,
                    paint: {
                        // Increase weight for injuries
                        'heatmap-weight': [
                            'interpolate',
                            ['linear'],
                            ['get', 'weight'],
                            0, 0,
                            2, 1
                        ],
                        // Increase intensity as zoom level increases
                        'heatmap-intensity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            0, 1,
                            17, 3
                        ],
                        // Color ramp for heatmap
                        'heatmap-color': [
                            'interpolate',
                            ['linear'],
                            ['heatmap-density'],
                            0, 'rgba(242,240,247,0)',
                            0.2, 'rgb(218,218,235)',
                            0.4, 'rgb(188,189,220)',
                            0.6, 'rgb(158,154,200)',
                            0.8, 'rgb(117,107,177)',
                            1, 'rgb(84,39,143)'
                        ],
                        // Adjust the heatmap radius by zoom level
                        'heatmap-radius': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            0, 2,
                            15, 12
                        ],
                        // Transition from heatmap to circle layer by zoom level
                        'heatmap-opacity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            12, .75,
                            22, 0
                        ]
                    }
                }, 'waterway-label');
                */
                
            }
            
            displayAccidentList(accidentsInIsochrone);
        }

        function filterAccidentsByIsochrone(isochronePolygon) {
            if (!carAccidentData || !carAccidentData.features) return [];
            
            const accidentsInIsochrone = [];
            carAccidentData.features.forEach(feature => {
                const point = turf.point(feature.geometry.coordinates);
                try {
                    if (turf.booleanPointInPolygon(point, isochronePolygon)) {
                        accidentsInIsochrone.push(feature);
                    }
                } catch (err) {
                    console.error('Error checking accident:', err);
                }
            });
            
            return accidentsInIsochrone;
        }

        function displayAccidentList(accidents) {
            const list = document.getElementById('accidentList');
            //const count = document.getElementById('accidentCount');
            //count.textContent = accidents.length;
            
            // Show the accident results section
            document.getElementById('accidentResults').style.display = 'block';
            
            if (accidents.length === 0) {
                list.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">ავარიები არ მოიძებნა</p>';
                return;
            }
            
            // Count by category
            const categories = { 'მძიმე': 0, 'მსუბუქი': 0 };
            accidents.forEach(f => {
                const cat = f.properties.category || 'მსუბუქი';
                categories[cat] = (categories[cat] || 0) + 1;
            });
            
            // Calculate percentages
            const severePercent = ((categories['მძიმე'] / accidents.length) * 100).toFixed(1);
            const lightPercent = ((categories['მსუბუქი'] / accidents.length) * 100).toFixed(1);
    
            // Ensure chartInstances object exists
            if (!window.chartInstances) window.chartInstances = {};

            // Small timeout to ensure canvas exists in DOM
            setTimeout(() => {
                const ctx = document.getElementById('accidentCategoryChart')?.getContext('2d');
                if (!ctx) return;

                // Destroy existing chart if present
                if (chartInstances.accidents) {
                    chartInstances.accidents.destroy();
                }

                chartInstances.accidents = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['მძიმე', 'მსუბუქი'],
                        datasets: [{
                            data: [
                                categories['მძიმე'] || 0, 
                                categories['მსუბუქი'] || 0
                            ],
                            backgroundColor: ['#ef4444', '#fbbf24'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        cutout: '75%',
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom',
                                labels: { font: { size: 10 } }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                padding: 8,
                                titleFont: { size: 11 },
                                bodyFont: { size: 10 }
                            }
                        }
                    }
                });
            }, 100);

            // Display accident list details
            list.innerHTML = `
                <div style="margin-top: 10px;">
                    <div style="font-size: 12px; color: #64748b; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                        ამ არეალში, სულ <strong>${accidents.length}</strong> ავტოსაგზაო შემთხვევა დაფიქსირდა (2021-2022 წლებში).
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                        <div style="background: linear-gradient(to right, #fffbeb 0%, rgba(255, 251, 235, 0) 100%); padding: 10px; border-radius: 0 5px 5px 0; border-left: 3px solid #fbbf24;">
                            <div style="font-size: 14px; color: #92400e;">მსუბუქი</div>
                            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${categories['მსუბუქი'] || 0}</div>
                            <div style="font-size: 12px; color: #f59e0b; margin-top: 4px; font-weight: 600;">${lightPercent}%</div>
                        </div>
                        <div style="background: linear-gradient(to right, #fef2f2 0%, rgba(255, 251, 235, 0) 100%); padding: 10px; border-radius: 0 5px 5px 0; border-left: 3px solid #ef4444;">
                            <div style="font-size: 14px; color: #991b1b;">სხეულის დაზიანებით</div>
                            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${categories['მძიმე'] || 0}</div>
                            <div style="font-size: 12px; color: #ef4444; margin-top: 4px; font-weight: 600;">${severePercent}%</div>
                        </div>
                    </div>
                </div>
            `;
        }