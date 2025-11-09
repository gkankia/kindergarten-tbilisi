// ============================================================
// SCHOOL DATA SUMMARY ANALYSIS
// Aggregates and displays school statistics within isochrone
// ============================================================

function analyzeSchoolsInIsochrone(schoolsInIsochrone) {
    if (!schoolsInIsochrone || schoolsInIsochrone.length === 0) {
        return null;
    }

    let totalStudents = 0;
    let totalUrgentCost = 0;
    let totalNonUrgentCost = 0;
    let totalLongTermCost = 0;
    let occupancyValues = [];
    let schoolsWithData = 0;

    // Condition counters (match exact field values)
    const conditionCounts = {
        'ჩასანაცვლებელია': 0,
        'ცუდი': 0,
        'დამაკმაყოფილებელი': 0,
        'კარგი': 0,
        'unknown': 0
    };

    schoolsInIsochrone.forEach(feature => {
        const props = feature.properties;
        
        if (props.students > 0) {
            totalStudents += props.students;
        }
        
        totalUrgentCost += props.urgent_cost || 0;
        totalNonUrgentCost += props.non_urg_cost || 0;
        totalLongTermCost += props.long_cost || 0;
        
        if (props.occupancy > 0) {
            occupancyValues.push(props.occupancy);
            schoolsWithData++;
        }

        // Track condition values - now using the 'condition' property passed from filter
        if (props.condition) {
            const cond = props.condition.trim();
            // Check if this exact condition exists in our counts
            if (conditionCounts.hasOwnProperty(cond)) {
                conditionCounts[cond]++;
            } else {
                // Log unrecognized conditions for debugging
                console.log('Unrecognized condition:', cond);
                conditionCounts.unknown++;
            }
        } else {
            conditionCounts.unknown++;
        }
    });

    const totalInvestment = totalUrgentCost + totalNonUrgentCost + totalLongTermCost;
    
    // Calculate median occupancy
    const medianOccupancy = calculateMedianOccupancy(occupancyValues);
    
    // Calculate average occupancy
    const avgOccupancy = occupancyValues.length > 0 
        ? occupancyValues.reduce((sum, val) => sum + val, 0) / occupancyValues.length 
        : 0;

    // Categorize schools by occupancy (corrected thresholds)
    const underutilized = occupancyValues.filter(o => o < 70).length;
    const optimal = occupancyValues.filter(o => o >= 70 && o <= 90).length;
    const overcrowded = occupancyValues.filter(o => o > 90).length;

    console.log('Condition counts:', conditionCounts);

    return {
        totalSchools: schoolsInIsochrone.length,
        totalStudents,
        medianOccupancy: Math.round(medianOccupancy),
        avgOccupancy: Math.round(avgOccupancy),
        totalInvestment,
        urgentInvestment: totalUrgentCost,
        nonUrgentInvestment: totalNonUrgentCost,
        longTermInvestment: totalLongTermCost,
        schoolsWithData,
        occupancyDistribution: {
            underutilized,
            optimal,
            overcrowded
        },
        avgInvestmentPerSchool: Math.round(totalInvestment / schoolsInIsochrone.length),
        avgStudentsPerSchool: Math.round(totalStudents / schoolsInIsochrone.length),
        conditionCounts
    };
}

function calculateMedianOccupancy(values) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

function displaySchoolSummary(summary) {
    const container = document.getElementById('schoolSummaryContent');
    
    if (!summary || summary.totalSchools === 0) {
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">ამ არეალში სკოლები არ მოიძებნა</p>';
        }
        return;
    }

    // Determine occupancy status color and message
    let occupancyStatus = '';
    let occupancyColor = '';
    if (summary.medianOccupancy < 70) {
        occupancyStatus = 'დაბალი დატვირთულობა';
        occupancyColor = '#3b82f6';
    } else if (summary.medianOccupancy <= 90) {
        occupancyStatus = 'ოპტიმალური დატვირთულობა';
        occupancyColor = '#22c55e';
    } else if (summary.medianOccupancy <= 100) {
        occupancyStatus = 'მაღალი დატვირთულობა';
        occupancyColor = '#f59e0b';
    } else {
        occupancyStatus = 'გადატვირთული';
        occupancyColor = '#ef4444';
    }

    const html = `
        <div class="school-summary-container">
            <!-- Overview Statistics -->
            <div class="summary-section">
                <h4 style="margin: 15px 0 15px 0; color: #1d91c0; padding: 10px 0 10px 0;">
                    მონიშნულ არეალში გვხვდება
                </h4>
                
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-value" style="color: #1d91c0;">${summary.totalSchools}</div>
                        <div class="stat-label">სკოლა</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-value" style="color: #1d91c0;">${summary.totalStudents.toLocaleString()}</div>
                        <div class="stat-label">მოსწავლით</div>
                    </div>
                </div>
                <div class="stat-sublabel">ეს ნიშნავს, რომ თითო სკოლაში, საშუალოდ ${summary.avgStudentsPerSchool} მოსწავლეა.</div>
            </div>

            <!-- Occupancy Analysis -->
            <div class="summary-section">
                
                <div class="occupancy-highlight" style="background: linear-gradient(135deg, ${occupancyColor}15, ${occupancyColor}05); border-left: 4px solid ${occupancyColor}; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 13px; font-weight: 600;">მედიანა დატვირთულობა</span>
                        <span style="font-size: 24px; font-weight: bold; color: ${occupancyColor};">${summary.medianOccupancy}%</span>
                    </div>
                    <div style="font-size: 12px; color: ${occupancyColor}; font-weight: 500;">
                        ${occupancyStatus}
                    </div>
                </div>
            </div>

            <!-- Facility Condition Analysis -->
            <div class="summary-section">
                <h4 style="margin-bottom: 12px; color: #1d91c0; border-bottom: 2px solid #1d91c0; padding-bottom: 8px;">
                    🏗️ შენობის მდგომარეობა
                </h4>
                
                <div class="condition-grid">
                    ${summary.conditionCounts['ჩასანაცვლებელია'] > 0 ? `
                    <div class="condition-card" style="background: linear-gradient(135deg, #dc262615, #dc262605); border-left: 3px solid #dc2626;">
                        <div class="condition-icon" style="color: #dc2626;">🚨</div>
                        <div class="condition-value" style="color: #dc2626;">${summary.conditionCounts['ჩასანაცვლებელია']}</div>
                        <div class="condition-label">ჩანაცვლება</div>
                        <div class="condition-percent">${((summary.conditionCounts['ჩასანაცვლებელია'] / summary.totalSchools) * 100).toFixed(0)}%</div>
                    </div>` : ''}

                    ${summary.conditionCounts['ცუდი'] > 0 ? `
                    <div class="condition-card" style="background: linear-gradient(135deg, #ef444415, #ef444405); border-left: 3px solid #ef4444;">
                        <div class="condition-icon" style="color: #ef4444;">⚠️</div>
                        <div class="condition-value" style="color: #ef4444;">${summary.conditionCounts['ცუდი']}</div>
                        <div class="condition-label">ცუდი</div>
                        <div class="condition-percent">${((summary.conditionCounts['ცუდი'] / summary.totalSchools) * 100).toFixed(0)}%</div>
                    </div>` : ''}

                    ${summary.conditionCounts['დამაკმაყოფილებელი'] > 0 ? `
                    <div class="condition-card" style="background: linear-gradient(135deg, #f59e0b15, #f59e0b05); border-left: 3px solid #f59e0b;">
                        <div class="condition-icon" style="color: #f59e0b;">⚡</div>
                        <div class="condition-value" style="color: #f59e0b;">${summary.conditionCounts['დამაკმაყოფილებელი']}</div>
                        <div class="condition-label">საშუალო</div>
                        <div class="condition-percent">${((summary.conditionCounts['დამაკმაყოფილებელი'] / summary.totalSchools) * 100).toFixed(0)}%</div>
                    </div>` : ''}

                    ${summary.conditionCounts['კარგი'] > 0 ? `
                    <div class="condition-card" style="background: linear-gradient(135deg, #22c55e15, #22c55e05); border-left: 3px solid #22c55e;">
                        <div class="condition-icon" style="color: #22c55e;">✅</div>
                        <div class="condition-value" style="color: #22c55e;">${summary.conditionCounts['კარგი']}</div>
                        <div class="condition-label">კარგი</div>
                        <div class="condition-percent">${((summary.conditionCounts['კარგი'] / summary.totalSchools) * 100).toFixed(0)}%</div>
                    </div>` : ''}
                </div>

                ${(summary.conditionCounts.unknown || 0) > 0 ? `
                <div style="margin-top: 12px; padding: 8px; background: #f1f5f9; border-radius: 6px; font-size: 11px; color: #64748b; text-align: center;">
                    <span style="font-weight: 600;">${summary.conditionCounts.unknown}</span> სკოლის მდგომარეობა უცნობია
                </div>
                ` : ''}
            </div>

        
            <!-- Investment Needs -->
            <div class="summary-section">
                <h4 style="margin-bottom: 12px; color: #1d91c0; border-bottom: 2px solid #1d91c0; padding-bottom: 8px;">
                    💰 საჭირო ინვესტიცია
                </h4>
                
                <div class="investment-total" style="background: linear-gradient(135deg, #1d91c015, #1d91c005); padding: 16px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
                    <div style="font-size: 13px; color: #666; margin-bottom: 4px;">საჭირო ინვესტიცია</div>
                    <div style="font-size: 28px; font-weight: bold; color: #1d91c0;">
                        ${(summary.totalInvestment / 1000000).toFixed(2)} მლნ ₾
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 4px;">
                        საშუალოდ ${(summary.avgInvestmentPerSchool / 1000000).toFixed(2)} მლნ ₾ თითო სკოლაზე
                    </div>
                </div>

                <div class="investment-breakdown">
                    <div class="investment-item">
                        <div class="investment-bar" style="width: ${summary.totalInvestment > 0 ? (summary.urgentInvestment / summary.totalInvestment * 100) : 0}%; background: #ef4444;"></div>
                        <div class="investment-details">
                            <span class="investment-label">სასწრაფო</span>
                            <span class="investment-amount">${(summary.urgentInvestment / 1000000).toFixed(2)} მლნ ₾</span>
                        </div>
                    </div>

                    <div class="investment-item">
                        <div class="investment-bar" style="width: ${summary.totalInvestment > 0 ? (summary.nonUrgentInvestment / summary.totalInvestment * 100) : 0}%; background: #f59e0b;"></div>
                        <div class="investment-details">
                            <span class="investment-label">არასასწრაფო</span>
                            <span class="investment-amount">${(summary.nonUrgentInvestment / 1000000).toFixed(2)} მლნ ₾</span>
                        </div>
                    </div>

                    <div class="investment-item">
                        <div class="investment-bar" style="width: ${summary.totalInvestment > 0 ? (summary.longTermInvestment / summary.totalInvestment * 100) : 0}%; background: #3b82f6;"></div>
                        <div class="investment-details">
                            <span class="investment-label">გრძელვადიანი</span>
                            <span class="investment-amount">${(summary.longTermInvestment / 1000000).toFixed(2)} მლნ ₾</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Key Insights -->
            <div class="summary-section">
                <h4 style="margin-bottom: 12px; color: #1d91c0; border-bottom: 2px solid #1d91c0; padding-bottom: 8px;">
                    💡 ძირითადი დასკვნები
                </h4>
                <div class="insights-list">
                    ${generateInsights(summary)}
                </div>
            </div>
        </div>
    `;

    if (container) {
        container.innerHTML = html;
    }

    // Show the results section
    const resultsSection = document.getElementById('schoolSummaryResults');
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
}

function generateInsights(summary) {
    const insights = [];

    // Facility condition insights
    const needsReplacement = summary.conditionCounts['ჩასანაცვლებელია'] || 0;
    const badCondition = summary.conditionCounts['ცუდი'] || 0;
    const totalPoorCondition = needsReplacement + badCondition;
    
    if (needsReplacement > 0) {
        insights.push(`<div class="insight-item">🚨 <strong>${needsReplacement}</strong> სკოლა საჭიროებს სრულ ჩანაცვლებას - პრიორიტეტული ინვესტიციაა საჭირო.</div>`);
    }
    
    if (totalPoorCondition > summary.totalSchools / 2) {
        insights.push(`<div class="insight-item">⚠️ სკოლების ნახევარზე მეტი (<strong>${totalPoorCondition}</strong>) ცუდ მდგომარეობაშია - აუცილებელია ფართომასშტაბიანი რეაბილიტაციის პროგრამა.</div>`);
    }

    // Student capacity insight
    if (summary.avgStudentsPerSchool > 800) {
        insights.push(`<div class="insight-item">📚 საშუალოდ, სკოლებში <strong>${summary.avgStudentsPerSchool}</strong> მოსწავლეა, რაც მაღალ დატვირთულობაზე მიუთითებს.</div>`);
    } else if (summary.avgStudentsPerSchool < 400) {
        insights.push(`<div class="insight-item">📚 საშუალოდ, სკოლებში <strong>${summary.avgStudentsPerSchool}</strong> მოსწავლეა, რაც შედარებით დაბალ დატვირთულობაზე მიუთითებს.</div>`);
    }

    // Occupancy insight
    if (summary.medianOccupancy > 100) {
        insights.push(`<div class="insight-item">⚠️ სკოლების დატვირთულობის მედიანა <strong>${summary.medianOccupancy}%</strong> შეადგენს - გადატვირთულობის ნიშანია.</div>`);
    } else if (summary.medianOccupancy < 70) {
        insights.push(`<div class="insight-item">✅ სკოლების დატვირთულობის მედიანა <strong>${summary.medianOccupancy}%</strong> შეადგენს - არსებობს დამატებითი ტევადობა.</div>`);
    }

    // Investment priority insight
    if (summary.totalInvestment > 0) {
        const urgentPercent = (summary.urgentInvestment / summary.totalInvestment * 100).toFixed(0);
        if (urgentPercent > 50) {
            insights.push(`<div class="insight-item">🔴 ინვესტიციების <strong>${urgentPercent}%</strong> სასწრაფოა - საჭიროა დაუყოვნებელი ჩარევა.</div>`);
        }
    }

    // Overcrowding insight
    if (summary.occupancyDistribution.overcrowded > summary.totalSchools / 2) {
        insights.push(`<div class="insight-item">🏫 სკოლების <strong>${summary.occupancyDistribution.overcrowded}</strong> გადატვირთულია (>90%) - საჭიროა ახალი სკოლების მშენებლობა.</div>`);
    }

    // Investment per school insight
    if (summary.avgInvestmentPerSchool > 1000000) {
        insights.push(`<div class="insight-item">💰 საშუალოდ, ერთ სკოლას <strong>${(summary.avgInvestmentPerSchool / 1000000).toFixed(2)} მლნ ₾</strong> სჭირდება - მნიშვნელოვანი ინვესტიციაა საჭირო.</div>`);
    }

    if (insights.length === 0) {
        insights.push(`<div class="insight-item">✅ სკოლების მდგომარეობა შედარებით სტაბილურია.</div>`);
    }

    return insights.join('');
}

// Integration function to call when school isochrone is generated
function integrateSchoolSummary(schoolsInIsochrone) {
    const summary = analyzeSchoolsInIsochrone(schoolsInIsochrone);
    displaySchoolSummary(summary);
}

// Export for use in main code
if (typeof window !== 'undefined') {
    window.analyzeSchoolsInIsochrone = analyzeSchoolsInIsochrone;
    window.displaySchoolSummary = displaySchoolSummary;
    window.integrateSchoolSummary = integrateSchoolSummary;
}