// ============================================================
// SCHOOL DATA SUMMARY ANALYSIS - FIXED VERSION WITH DEBUGGING
// ============================================================

// ==================== CONSTANTS ====================
const THRESHOLDS = {
  OCCUPANCY: {
    UNDERUTILIZED: 70,
    OPTIMAL_MAX: 90,
    LOW: 60,
    MEDIUM: 75
  },
  ACCESSIBILITY_SCORE: {
    POOR: 30,
    AVERAGE: 60
  },
  CONDITION: {
    CRITICAL: 50,
    NEEDS_ATTENTION: 25
  },
  OVERCROWDING: {
    CRITICAL: 60,
    HIGH: 30
  }
};

const COLORS = {
  CONDITION: {
    'ჩასანაცვლებელია': '#dc2626',
    'ცუდი': '#ef4444',
    'დამაკმაყოფილებელი': '#f59e0b',
    'კარგი': '#22c55e'
  },
  ACCESSIBILITY: {
    'Good': '#22c55e',
    'Fair': '#f59e0b',
    'Bad': '#ef4444',
    'Damaged': '#dc2626',
    'Does not exist': '#991b1b',
    'NA': '#9ca3af'
  },
  PRIMARY: '#1d91c0',
  INVESTMENT: {
    URGENT: '#ef4444',
    NON_URGENT: '#f59e0b',
    LONG_TERM: '#3b82f6'
  }
};

const CONDITION_ORDER = ['ჩასანაცვლებელია', 'ცუდი', 'დამაკმაყოფილებელი', 'კარგი'];

// Possible property name variations for accessibility features
const ACCESSIBILITY_FEATURES = [
  { 
    key: 'ramps', 
    label: 'პანდუსები', 
    possibleNames: ['Ramp', 'ramp', 'რამპა', 'პანდუსი']
  },
  { 
    key: 'lifts', 
    label: 'ლიფტები', 
    possibleNames: ['Adapted elevator', 'adapted_elevator', 'elevator', 'ლიფტი']
  },
  { 
    key: 'adaptedWC', 
    label: 'ადაპტირებული WC', 
    possibleNames: ['Adapted WC', 'adapted_wc', 'WC', 'ტუალეტი']
  }
];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Debug logger that can be toggled
 */
const DEBUG = true;
function debugLog(message, data) {
  if (DEBUG && typeof console !== 'undefined') {
    console.log(`[DEBUG] ${message}`, data || '');
  }
}

/**
 * Safely formats a number in Georgian locale
 */
function formatNumber(num, decimals = 0) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return decimals > 0 ? num.toFixed(decimals) : Math.round(num).toLocaleString('ka-GE');
}

/**
 * Calculates median from array of numbers
 */
function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Finds property value by trying multiple possible names
 */
function findPropertyByNames(properties, possibleNames) {
  if (!properties) return null;
  
  for (const name of possibleNames) {
    if (properties.hasOwnProperty(name) && properties[name] !== null && properties[name] !== undefined) {
      return properties[name];
    }
  }
  return null;
}

/**
 * Normalizes accessibility status values (Georgian to English)
 */
function normalizeAccessibilityStatus(value) {
  if (!value || value === null || value === undefined) return 'NA';
  
  const strValue = String(value).trim();
  
  // Map Georgian and English variations to standard English values
  const statusMap = {
    // Georgian
    'კარგი': 'Good',
    'დამაკმაყოფილებელი': 'Fair',
    'ცუდი': 'Bad',
    'დაზიანებული': 'Damaged',
    'არ აქვს': 'Does not exist',
    'არ არსებობს': 'Does not exist',
    'შესაცვლელი': 'Damaged',
    // English (lowercase)
    'good': 'Good',
    'fair': 'Fair',
    'bad': 'Bad',
    'damaged': 'Damaged',
    'does not exist': 'Does not exist',
    'replacement': 'Damaged',
    'na': 'NA'
  };
  
  const normalized = statusMap[strValue.toLowerCase()] || statusMap[strValue];
  return normalized || 'NA';
}

/**
 * Creates initialized counter object for accessibility features
 */
function createAccessibilityCounter() {
  const statuses = ['Good', 'Fair', 'Bad', 'Damaged', 'Does not exist', 'NA'];
  return ACCESSIBILITY_FEATURES.reduce((acc, feature) => {
    acc[feature.key] = statuses.reduce((statusAcc, status) => {
      statusAcc[status] = 0;
      return statusAcc;
    }, {});
    return acc;
  }, {});
}

// ==================== DATA ANALYSIS ====================

/**
 * Analyzes schools within isochrone and returns comprehensive summary
 */
function analyzeSchoolsInIsochrone(schoolsInIsochrone) {
  debugLog('Starting analysis', { schoolCount: schoolsInIsochrone?.length });
  
  if (!Array.isArray(schoolsInIsochrone) || schoolsInIsochrone.length === 0) {
    debugLog('No schools to analyze');
    return null;
  }

  // Debug: Check first school structure BEFORE processing
  if (schoolsInIsochrone.length > 0) {
    const firstSchool = schoolsInIsochrone[0];
    console.log('=== RAW FIRST SCHOOL OBJECT ===');
    console.log('Full object:', firstSchool);
    console.log('Has properties?', !!firstSchool.properties);
    console.log('Properties object:', firstSchool.properties);
    
    if (firstSchool.properties) {
      const allKeys = Object.keys(firstSchool.properties);
      console.log('Total property count:', allKeys.length);
      console.log('First 20 keys:', allKeys.slice(0, 20));
      console.log('Last 20 keys:', allKeys.slice(-20));
      
      // Search for accessibility keys
      console.log('Keys containing "ramp":', allKeys.filter(k => k.toLowerCase().includes('ramp')));
      console.log('Keys containing "lift" or "elevator":', allKeys.filter(k => k.toLowerCase().includes('lift') || k.toLowerCase().includes('elevator')));
      console.log('Keys containing "wc":', allKeys.filter(k => k.toLowerCase().includes('wc')));
      console.log('Keys containing "adapted":', allKeys.filter(k => k.toLowerCase().includes('adapted')));
      
      // Check specific fields we think exist
      console.log('props.Ramp =', firstSchool.properties['Ramp']);
      console.log('props["Adapted elevator"] =', firstSchool.properties['Adapted elevator']);
      console.log('props["Adapted WC"] =', firstSchool.properties['Adapted WC']);
    }
  }

  const aggregates = {
    totalStudents: 0,
    totalUrgentCost: 0,
    totalNonUrgentCost: 0,
    totalLongTermCost: 0,
    occupancyValues: [],
    schoolsWithData: 0,
    accessibilityScores: []
  };

  const conditionCounts = CONDITION_ORDER.reduce((acc, cond) => {
    acc[cond] = 0;
    return acc;
  }, { unknown: 0 });

  const accessibilityCounts = createAccessibilityCounter();

  // Process each school
  schoolsInIsochrone.forEach((feature, index) => {
    try {
      processSchoolData(feature, aggregates, conditionCounts, accessibilityCounts, index);
    } catch (error) {
      debugLog(`Error processing school ${index}`, error);
    }
  });

  debugLog('Analysis complete', {
    totalSchools: schoolsInIsochrone.length,
    accessibilityScoresCount: aggregates.accessibilityScores.length,
    sampleScores: aggregates.accessibilityScores.slice(0, 5)
  });

  return calculateSummaryStatistics(
    schoolsInIsochrone.length,
    aggregates,
    conditionCounts,
    accessibilityCounts
  );
}

/**
 * Processes individual school data and updates aggregates
 */
function processSchoolData(feature, aggregates, conditionCounts, accessibilityCounts, schoolIndex) {
  const props = feature.properties || {};
  
  // Aggregate numeric values
  const students = parseFloat(props.students) || 0;
  if (students > 0) {
    aggregates.totalStudents += students;
  }
  
  aggregates.totalUrgentCost += parseFloat(props.urgent_cost) || 0;
  aggregates.totalNonUrgentCost += parseFloat(props.non_urg_cost) || 0;
  aggregates.totalLongTermCost += parseFloat(props.long_cost) || 0;
  
  const occupancy = parseFloat(props.occupancy) || 0;
  if (occupancy > 0) {
    aggregates.occupancyValues.push(occupancy);
    aggregates.schoolsWithData++;
  }

  // Track condition
  trackCondition(props.condition, conditionCounts);
  
  // Use the English property names (as they come from the GeoJSON)
  const rampValue = props['Ramp'];
  const liftValue = props['Adapted elevator'];
  const wcValue = props['Adapted WC'];
  
  if (schoolIndex < 3) {
    console.log(`School ${schoolIndex} accessibility values:`, {
      Ramp: rampValue,
      'Adapted elevator': liftValue,
      'Adapted WC': wcValue
    });
  }
  
  if (schoolIndex < 3) {
    console.log(`School ${schoolIndex} RAW (Georgian):`, {
      ramps: rampValue,
      lifts: liftValue,
      acc_wc: wcValue
    });
  }
  
  // Normalize status values (Georgian to English)
  const rampStatus = normalizeAccessibilityStatus(rampValue);
  const liftStatus = normalizeAccessibilityStatus(liftValue);
  const wcStatus = normalizeAccessibilityStatus(wcValue);
  
  if (schoolIndex < 3) {
    console.log(`School ${schoolIndex} NORMALIZED:`, {
      ramp: `${rampValue} → ${rampStatus}`,
      lift: `${liftValue} → ${liftStatus}`,
      wc: `${wcValue} → ${wcStatus}`
    });
  }
  
  // Track accessibility features
  trackAccessibilityFeature('ramps', rampStatus, accessibilityCounts);
  trackAccessibilityFeature('lifts', liftStatus, accessibilityCounts);
  trackAccessibilityFeature('adaptedWC', wcStatus, accessibilityCounts);
  
  // Calculate individual school accessibility score
  const schoolAccessibility = calculateSchoolAccessibilityScore(rampStatus, liftStatus, wcStatus);
  console.log(`School ${schoolIndex} SCORE:`, schoolAccessibility);
  aggregates.accessibilityScores.push(schoolAccessibility);
}

/**
 * Tracks building condition
 */
function trackCondition(condition, conditionCounts) {
  if (!condition) {
    conditionCounts.unknown++;
    return;
  }

  const trimmedCondition = String(condition).trim();
  if (conditionCounts.hasOwnProperty(trimmedCondition)) {
    conditionCounts[trimmedCondition]++;
  } else {
    conditionCounts.unknown++;
  }
}

/**
 * Tracks a single accessibility feature
 */
function trackAccessibilityFeature(featureKey, status, accessibilityCounts) {
  const counts = accessibilityCounts[featureKey];
  
  if (counts && counts.hasOwnProperty(status)) {
    counts[status]++;
  } else if (counts) {
    counts['NA']++;
  }
}

/**
 * Calculates comprehensive accessibility score for a single school
 */
function calculateSchoolAccessibilityScore(rampStatus, liftStatus, wcStatus) {
  const statusWeights = {
    'Good': 1.0,
    'Fair': 0.65,
    'Bad': 0.30,
    'Damaged': 0.10,
    'Does not exist': 0.0,
    'NA': null
  };

  const featureWeights = {
    ramps: 0.45,
    lifts: 0.30,
    adaptedWC: 0.25
  };

  const features = [
    { status: rampStatus, weight: featureWeights.ramps },
    { status: liftStatus, weight: featureWeights.lifts },
    { status: wcStatus, weight: featureWeights.adaptedWC }
  ];

  let totalWeight = 0;
  let totalScore = 0;
  let unknownCount = 0;

  features.forEach(feature => {
    const statusWeight = statusWeights[feature.status];
    
    if (statusWeight === null || statusWeight === undefined) {
      unknownCount++;
    } else {
      totalScore += statusWeight * feature.weight;
      totalWeight += feature.weight;
    }
  });

  // If all features are unknown, return null
  if (unknownCount === 3) {
    return { score: null, category: 'insufficient_data', unknownFeatures: 3 };
  }

  // Normalize score to 0-100
  const normalizedScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  const category = categorizeAccessibilityScore(normalizedScore, unknownCount);

  return { 
    score: Math.round(normalizedScore), 
    category,
    unknownFeatures: unknownCount
  };
}

/**
 * Categorizes accessibility score into quality levels
 */
function categorizeAccessibilityScore(score, unknownCount) {
  if (unknownCount > 0) {
    if (score >= 75) return 'good_with_gaps';
    if (score >= 50) return 'fair_with_gaps';
    if (score >= 25) return 'poor_with_gaps';
    return 'critical_with_gaps';
  }

  if (score >= 85) return 'perfect';
  if (score >= 65) return 'good';
  if (score >= 45) return 'fair';
  if (score >= 20) return 'poor';
  if (score > 0) return 'critical';
  return 'non_existent';
}

/**
 * Calculates final summary statistics
 */
function calculateSummaryStatistics(totalSchools, aggregates, conditionCounts, accessibilityCounts) {
  const totalInvestment = aggregates.totalUrgentCost + 
                         aggregates.totalNonUrgentCost + 
                         aggregates.totalLongTermCost;

  const medianOccupancy = calculateMedian(aggregates.occupancyValues);
  const avgOccupancy = aggregates.occupancyValues.length > 0 
    ? aggregates.occupancyValues.reduce((sum, val) => sum + val, 0) / aggregates.occupancyValues.length 
    : 0;

  const occupancyDistribution = {
    underutilized: aggregates.occupancyValues.filter(o => o < THRESHOLDS.OCCUPANCY.UNDERUTILIZED).length,
    optimal: aggregates.occupancyValues.filter(o => 
      o >= THRESHOLDS.OCCUPANCY.UNDERUTILIZED && o <= THRESHOLDS.OCCUPANCY.OPTIMAL_MAX
    ).length,
    overcrowded: aggregates.occupancyValues.filter(o => o > THRESHOLDS.OCCUPANCY.OPTIMAL_MAX).length
  };

  const summary = {
    totalSchools,
    totalStudents: aggregates.totalStudents,
    medianOccupancy: Math.round(medianOccupancy),
    avgOccupancy: Math.round(avgOccupancy),
    totalInvestment,
    urgentInvestment: aggregates.totalUrgentCost,
    nonUrgentInvestment: aggregates.totalNonUrgentCost,
    longTermInvestment: aggregates.totalLongTermCost,
    schoolsWithData: aggregates.schoolsWithData,
    occupancyDistribution,
    avgInvestmentPerSchool: Math.round(totalInvestment / totalSchools),
    avgStudentsPerSchool: Math.round(aggregates.totalStudents / totalSchools),
    conditionCounts,
    accessibilityCounts,
    accessibilityScores: aggregates.accessibilityScores
  };

  debugLog('Summary statistics', {
    totalSchools: summary.totalSchools,
    accessibilityScoresCount: summary.accessibilityScores.length,
    sampleAccessibilityScores: summary.accessibilityScores.slice(0, 3)
  });

  return summary;
}

// ==================== UI GENERATION (keeping your existing functions) ====================

// [All your existing UI generation functions remain the same]
// I'm keeping them unchange
  
  // ==================== UI GENERATION ====================
  
  /**
   * Main display function - renders complete school summary
   */
  function displaySchoolSummary(summary) {
    const container = document.getElementById('schoolSummaryContent');
    if (!container) return;
  
    if (!summary || summary.totalSchools === 0) {
      container.innerHTML = createEmptyStateHTML();
      return;
    }
  
    try {
      container.innerHTML = createSummaryHTML(summary);
      showResultsSection();
    } catch (error) {
      console.error('Error displaying school summary:', error);
      container.innerHTML = '<p style="color: #ef4444; padding: 20px;">შეცდომა მონაცემების ჩვენებისას</p>';
    }
  }
  
  /**
   * Creates HTML for empty state
   */
  function createEmptyStateHTML() {
    return '<p style="text-align: center; color: #999; padding: 20px;">ამ არეალში სკოლები არ მოიძებნა</p>';
  }
  
  /**
   * Creates complete summary HTML
   */
  function createSummaryHTML(summary) {
    const occupancyInfo = getOccupancyInfo(summary.medianOccupancy);
    
    return `
      <div class="school-summary-container">
        ${createOverviewSection(summary, occupancyInfo)}
        ${createAccessibilitySection(summary)}
        ${createConditionSection(summary)}
        ${createInvestmentSection(summary)}
        ${createInsightsSection(summary)}
      </div>
    `;
  }
  
  /**
   * Gets occupancy status information
   */
  function getOccupancyInfo(medianOccupancy) {
    if (medianOccupancy < THRESHOLDS.OCCUPANCY.LOW) {
      return { status: 'დაბალ მაჩვენებელზე', color: '#3b82f6' };
    } else if (medianOccupancy <= THRESHOLDS.OCCUPANCY.MEDIUM) {
      return { status: 'ოპტიმალურ მაჩვენებელზე', color: '#22c55e' };
    } else if (medianOccupancy <= THRESHOLDS.OCCUPANCY.OPTIMAL_MAX) {
      return { status: 'მაღალ მაჩვენებელზე', color: '#f59e0b' };
    } else {
      return { status: 'განსაკუთრებით მაღალ მაჩვენებელზე', color: '#ef4444' };
    }
  }
  
  /**
   * Creates overview section HTML
   */
  function createOverviewSection(summary, occupancyInfo) {
    return `
      <div class="summary-section">
        <h4 style="margin: 15px 0; color: #666666; padding: 10px 0;">
          მონიშნულ არეალში გვხვდება
        </h4>
        
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value" style="color: ${COLORS.PRIMARY};">${summary.totalSchools}</div>
            <div class="stat-label">სკოლა</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value" style="color: ${COLORS.PRIMARY};">${formatNumber(summary.totalStudents)}</div>
            <div class="stat-label">მოსწავლით</div>
          </div>
        </div>
        
        <div class="stat-sublabel">
          რაც მიუთითებს სკოლების გადატვირთულობის 
          <span style="font-size: 12px; font-weight: bold; color: ${occupancyInfo.color};">
            ${occupancyInfo.status}
          </span>
        </div>
  
        <div class="occupancy-highlight" style="background: linear-gradient(to right, ${occupancyInfo.color}15, ${occupancyInfo.color}01); 
             border-left: 4px solid ${occupancyInfo.color}; padding: 15px; margin: 0 0 15px 0;">
          <div style="display: flex; justify-content: center; align-items: center; margin: 10px 0;">
            <span style="font-size: 30px; font-weight: bold; color: ${occupancyInfo.color};">
              ${summary.medianOccupancy}%
            </span>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Creates accessibility section HTML
   */
  function createAccessibilitySection(summary) {
    const accessibilityContent = generateAccessibilityContent(summary);
    
    return `
      <div class="summary-section">
        <h4 style="margin-bottom: 12px; color: #666; padding-bottom: 8px;">
          ადაპტირებული ინფრასტრუქტურა სკოლაში
        </h4>
        ${accessibilityContent}
      </div>
    `;
  }
  
  /**
 * Generates accessibility content with features and overall score
 */
function generateAccessibilityContent(summary) {
  let html = createTrivariateVisualization(summary);
  html += createAccessibilityScoreCard(summary);
  
  return html;
}

/**
 * Creates trivariate visualization for accessibility features
 */
function createTrivariateVisualization(summary) {
  const ramps = summary.accessibilityCounts.ramps;
  const lifts = summary.accessibilityCounts.lifts;
  const wc = summary.accessibilityCounts.adaptedWC;
  const total = summary.totalSchools;
  
  // Get the overall accessibility score that's already calculated
  const accessibilityData = calculateAggregateAccessibility(summary);
  const overallScore = accessibilityData.overallScore;
  
  // Calculate aggregate percentages for each feature (for visualization positioning only)
  const getQualityScore = (counts) => {
    const good = (counts['Good'] || 0) * 100;
    const fair = (counts['Fair'] || 0) * 65;
    const bad = (counts['Bad'] || 0) * 30;
    const damaged = (counts['Damaged'] || 0) * 10;
    return (good + fair + bad + damaged) / total;
  };
  
  const rampScore = getQualityScore(ramps);
  const liftScore = getQualityScore(lifts);
  const wcScore = getQualityScore(wc);
  
  // SVG triangle visualization
  const size = 200;
  const padding = 30;
  const height = (Math.sqrt(3) / 2) * size;
  
  // Triangle vertices
  const topX = size / 2 + padding;
  const topY = padding;
  const leftX = padding;
  const leftY = height + padding;
  const rightX = size + padding;
  const rightY = height + padding;
  
  // Calculate point position based on scores (barycentric coordinates)
  const sum = rampScore + liftScore + wcScore;
  const rampNorm = sum > 0 ? rampScore / sum : 0.33;
  const liftNorm = sum > 0 ? liftScore / sum : 0.33;
  const wcNorm = sum > 0 ? wcScore / sum : 0.33;
  
  const pointX = leftX * rampNorm + rightX * liftNorm + topX * wcNorm;
  const pointY = leftY * rampNorm + rightY * liftNorm + topY * wcNorm;
  
  // Status label mapping
  const statusLabels = {
    'Good': 'კარგი',
    'Fair': 'მისაღები',
    'Bad': 'ცუდი',
    'Damaged': 'დაზიანებული',
    'Does not exist': 'არ აქვს'
  };
  
  // Generate individual feature stats
  const getFeatureStats = (counts, label, icon) => {
    const statuses = ['Good', 'Fair', 'Bad', 'Damaged', 'Does not exist'];
    let stats = `<div style="margin-bottom: 8px;"><strong>${icon} ${label}:</strong><br/>`;
    statuses.forEach(status => {
      if (counts[status] > 0) {
        const percent = Math.round((counts[status] / total) * 100);
        stats += `<span style="font-size: 10px; color: ${COLORS.ACCESSIBILITY[status]};">● ${statusLabels[status]}: ${percent}%</span> `;
      }
    });
    stats += '</div>';
    return stats;
  };
  
  // Color gradient for triangle
  const rampColor = '#fbbf24'; // Amber for ramps
  const liftColor = '#60a5fa'; // Blue for lifts
  const wcColor = '#a78bfa';   // Purple for WC
  
  return `
    <div style="padding: 16px; margin-bottom: 16px;">
      
      <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
        <!-- Trivariate Triangle -->
        <div style="flex: 0 0 auto; justify-content: center; margin: 0 auto;">
          <svg width="${size + padding * 2.5}" height="${height + padding * 2.5}">
            <defs>
              <!-- Gradient from left (ramps) to right (lifts) -->
              <linearGradient id="rampToLift" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${rampColor};stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:${liftColor};stop-opacity:0.3" />
              </linearGradient>
              
              <!-- Gradient from bottom to top (WC influence) -->
              <linearGradient id="bottomToTop" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" style="stop-color:${rampColor};stop-opacity:0.15" />
                <stop offset="50%" style="stop-color:${liftColor};stop-opacity:0.15" />
                <stop offset="100%" style="stop-color:${wcColor};stop-opacity:0.4" />
              </linearGradient>
              
              <!-- Combined mesh gradient effect -->
              <radialGradient id="centerGlow">
                <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
              </radialGradient>
            </defs>
            
            <!-- Colored triangle fill -->
            <polygon points="${leftX},${leftY} ${rightX},${rightY} ${topX},${topY}" 
                     fill="url(#rampToLift)" stroke="none"/>
            <polygon points="${leftX},${leftY} ${rightX},${rightY} ${topX},${topY}" 
                     fill="url(#bottomToTop)" stroke="none"/>
            <polygon points="${leftX},${leftY} ${rightX},${rightY} ${topX},${topY}" 
                     fill="url(#centerGlow)" stroke="none"/>
            
            <!-- Grid lines for better reading -->
            <line x1="${leftX}" y1="${leftY}" x2="${(leftX + topX) / 2}" y2="${(leftY + topY) / 2}" 
                  stroke="#d1d5db" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>
            <line x1="${rightX}" y1="${rightY}" x2="${(rightX + topX) / 2}" y2="${(rightY + topY) / 2}" 
                  stroke="#d1d5db" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>
            <line x1="${leftX}" y1="${leftY}" x2="${(leftX + rightX) / 2}" y2="${leftY}" 
                  stroke="#d1d5db" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>
            
            <!-- Corner indicators -->
            <circle cx="${leftX}" cy="${leftY}" r="4" fill="${rampColor}" opacity="0.7"/>
            <circle cx="${rightX}" cy="${rightY}" r="4" fill="${liftColor}" opacity="0.7"/>
            <circle cx="${topX}" cy="${topY}" r="4" fill="${wcColor}" opacity="0.7"/>
            
            <!-- White data point with outline -->
            <circle cx="${pointX}" cy="${pointY}" r="3" fill="#1d91c0"/>
            
            <!-- Labels -->
            <text x="${leftX}" y="${leftY + 20}" text-anchor="middle" font-size="11" font-weight="600" fill="#d97706">პანდუსები</text>
            <text x="${rightX}" y="${rightY + 20}" text-anchor="middle" font-size="11" font-weight="600" fill="#2563eb">ლიფტები</text>
            <text x="${topX}" y="${topY - 10}" text-anchor="middle" font-size="11" font-weight="600" fill="#7c3aed">WC</text>
          </svg>
        </div>
        
        <!-- Stats breakdown 
        <div style="flex: 1; min-width: 200px; font-size: 11px; line-height: 1.6;">
          ${getFeatureStats(ramps, 'პანდუსები', '🚶')}
          ${getFeatureStats(lifts, 'ლიფტები', '🛗')}
          ${getFeatureStats(wc, 'ადაპტირებული WC', '♿')}
        </div>-->
      </div>
    </div>
  `;
}
  
  /**
   * Calculates comprehensive accessibility score for a single school
   * Considers all status combinations with weighted scoring
   */
  function calculateSchoolAccessibilityScore(rampStatus, liftStatus, wcStatus) {
    // Weight values for each status (0 = non-existent, 1 = perfect)
    const statusWeights = {
      'Good': 1.0,              // Good - full functionality
      'Fair': 0.65,             // Fair - usable but needs improvement
      'Bad': 0.30,              // Bad - barely functional
      'Damaged': 0.10,          // Damaged - hardly usable
      'Does not exist': 0.0,    // Doesn't have - no accessibility
      'NA': null                // Unknown - exclude from calculation
    };
  
    // Feature importance weights (ramps are most critical for basic access)
    const featureWeights = {
      ramps: 0.45,    // 45% - Most critical (ground floor access)
      lifts: 0.30,    // 30% - Important for multi-story buildings
      adaptedWC: 0.25 // 25% - Essential but less critical than mobility
    };
  
    const features = [
      { status: rampStatus, weight: featureWeights.ramps },
      { status: liftStatus, weight: featureWeights.lifts },
      { status: wcStatus, weight: featureWeights.adaptedWC }
    ];
  
    let totalWeight = 0;
    let totalScore = 0;
    let unknownCount = 0;
  
    features.forEach(feature => {
      const statusWeight = statusWeights[feature.status];
      
      if (statusWeight === null || statusWeight === undefined) {
        unknownCount++;
      } else {
        totalScore += statusWeight * feature.weight;
        totalWeight += feature.weight;
      }
    });
  
    // If all features are unknown, return null
    if (unknownCount === 3) {
      return { score: null, category: 'insufficient_data' };
    }
  
    // Normalize score to 0-100
    const normalizedScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  
    // Categorize the score
    const category = categorizeAccessibilityScore(normalizedScore, unknownCount);
  
    return { 
      score: Math.round(normalizedScore), 
      category,
      unknownFeatures: unknownCount
    };
  }
  
  /**
   * Categorizes accessibility score into quality levels
   */
  function categorizeAccessibilityScore(score, unknownCount) {
    // If we have unknown data, be more conservative
    if (unknownCount > 0) {
      if (score >= 75) return 'good_with_gaps';
      if (score >= 50) return 'fair_with_gaps';
      if (score >= 25) return 'poor_with_gaps';
      return 'critical_with_gaps';
    }
  
    // Full data categorization
    if (score >= 85) return 'perfect';      // 85-100: Excellent accessibility
    if (score >= 65) return 'good';         // 65-84: Good, minor improvements needed
    if (score >= 45) return 'fair';         // 45-64: Fair, significant improvements needed
    if (score >= 20) return 'poor';         // 20-44: Poor, major renovations required
    if (score > 0) return 'critical';       // 1-19: Critical, barely accessible
    return 'non_existent';                  // 0: No accessibility features
  }
  
  /**
   * Gets display information for accessibility category
   */
  function getAccessibilityCategoryInfo(category) {
    const categories = {
      'perfect': {
        label: 'შესანიშნავი',
        color: '#059669',
        description: 'სრულად ადაპტირებული'
      },
      'good': {
        label: 'კარგი',
        color: '#22c55e',
        description: 'კარგად ადაპტირებული - საჭიროა მცირე გაუმჯობესება'
      },
      'good_with_gaps': {
        label: 'კარგი*',
        color: '#22c55e',
        description: 'კარგად ადაპტირებული - არასრულყოფილი მონაცემები'
      },
      'fair': {
        label: 'საშუალო',
        color: '#f59e0b',
        description: 'მეტნაკლებად კარგად ადაპტირებული - საჭიროა მნიშვნელოვანი გაუმჯობესება'
      },
      'fair_with_gaps': {
        label: 'საშუალო*',
        color: '#f59e0b',
        description: 'მეტნაკლებად კარგად ადაპტირებული - არასრულყოფილი მონაცემები'
      },
      'poor': {
        label: 'ცუდი',
        color: '#ef4444',
        description: 'ცუდად ადაპტირებული - საჭიროა საფუძვლიანი გაუმჯობესება'
      },
      'poor_with_gaps': {
        label: 'ცუდი*',
        color: '#ef4444',
        description: 'ცუდად ადაპტირებული - არასრულყოფილი მონაცემები'
      },
      'critical': {
        label: 'კრიტიკული',
        color: '#dc2626',
        description: 'კრიტიკული - თითქმის მიუწვდომელი'
      },
      'critical_with_gaps': {
        label: 'კრიტიკული*',
        color: '#dc2626',
        description: 'კრიტიკული - არასრული ინფორმაცია'
      },
      'non_existent': {
        label: 'არ არსებობს',
        color: '#991b1b',
        description: 'არ არსებობს ადაპტირებული ინფრასტრუქტურა'
      },
      'insufficient_data': {
        label: 'უცნობი',
        color: '#9ca3af',
        description: 'არასაკმარისი მონაცემები'
      }
    };
  
    return categories[category] || categories['insufficient_data'];
  }
  
  /**
   * Calculates aggregate accessibility statistics for all schools
   */
  function calculateAggregateAccessibility(summary) {
    const accessibilityScores = summary.accessibilityScores || [];
    
    if (accessibilityScores.length === 0) {
      return {
        overallScore: 0,
        category: 'insufficient_data',
        totalMissing: 0,
        totalGood: 0,
        estimatedFullyAccessible: 0,
        estimatedNonAccessible: 0,
        categoryDistribution: {}
      };
    }
  
    // Calculate average score from individual schools
    const validScores = accessibilityScores.filter(s => s.score !== null && s.score !== undefined);
    
    if (validScores.length === 0) {
      return {
        overallScore: 0,
        category: 'insufficient_data',
        totalMissing: 0,
        totalGood: 0,
        estimatedFullyAccessible: 0,
        estimatedNonAccessible: 0,
        categoryDistribution: {}
      };
    }
    
    const totalScore = validScores.reduce((sum, s) => sum + s.score, 0);
    const averageScore = totalScore / validScores.length;
  
    // Count schools by category
    const categoryDistribution = {};
    accessibilityScores.forEach(schoolData => {
      const cat = schoolData.category;
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });
  
    // Calculate aggregate counts
    const acc = summary.accessibilityCounts;
    const totalMissing = acc.ramps['Does not exist'] + acc.lifts['Does not exist'] + acc.adaptedWC['Does not exist'];
    const totalGood = acc.ramps['Good'] + acc.lifts['Good'] + acc.adaptedWC['Good'];
  
    // Estimate fully accessible and non-accessible schools
    const estimatedFullyAccessible = (categoryDistribution['perfect'] || 0) + (categoryDistribution['good'] || 0);
    const estimatedNonAccessible = (categoryDistribution['non_existent'] || 0) + (categoryDistribution['critical'] || 0);
  
    // Determine overall category (considering if we have incomplete data)
    const hasIncompleteData = accessibilityScores.some(s => s.unknownFeatures > 0);
    const overallCategory = categorizeAccessibilityScore(averageScore, hasIncompleteData ? 1 : 0);
  
    return {
      overallScore: Math.round(averageScore),
      category: overallCategory,
      totalMissing,
      totalGood,
      estimatedFullyAccessible,
      estimatedNonAccessible,
      categoryDistribution,
      validScoresCount: validScores.length,
      totalSchools: accessibilityScores.length
    };
  }
  
  /**
   * Creates overall accessibility score card
   */
  function createAccessibilityScoreCard(summary) {
    const accessibilityData = calculateAggregateAccessibility(summary);
    const categoryInfo = getAccessibilityCategoryInfo(accessibilityData.category);
    
    return `
      <div style="margin-top: 16px; padding: 16px; background: linear-gradient(to right, ${categoryInfo.color}15, ${categoryInfo.color}05); 
           border-left: 4px solid ${categoryInfo.color}; border-radius: 0 8px 8px 0;">

        <div style="color: #666;">მისაწვდომობის ინდექსი (მაქს. 100)</div>
        
        <div style="display: flex; align-items: center; gap: 12px; margin: 0 auto;">
          <div>
            <div style="font-size: 30px; font-weight: bold; text-align: center; color: ${categoryInfo.color};">
              ${accessibilityData.overallScore}
            </div>
            
          </div>
        </div>
  
        ${accessibilityData.category.includes('with_gaps') ? `
          <div style="font-size: 10px; color: #666; margin-top: 8px; font-style: italic;">
            * არასრული მონაცემები
          </div>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Creates condition section HTML
   */
  function createConditionSection(summary) {
    let cardsHTML = '';
    
    CONDITION_ORDER.forEach(condition => {
      if (summary.conditionCounts[condition] > 0) {
        cardsHTML += createConditionCard(
          condition,
          summary.conditionCounts[condition],
          summary.totalSchools,
          COLORS.CONDITION[condition]
        );
      }
    });
  
    const unknownNote = summary.conditionCounts.unknown > 0 ? `
      <div style="margin-top: 12px; padding: 8px; 
           font-size: 12px; color: #666; text-align: center;">
        <span style="font-weight: 600;">${summary.conditionCounts.unknown}</span> სკოლის მდგომარეობა უცნობია
      </div>
    ` : '';
  
    return `
      <!--<div class="summary-section">
        <h4 style="margin-bottom: 12px; color: #666; padding-bottom: 8px;">
          სკოლის შენობის კაპიტალური მდგომარეობა
        </h4>
        <div class="condition-grid">
          ${cardsHTML}
        </div>
        ${unknownNote}
      </div>-->
    `;
  }
  
  /**
   * Creates individual condition card
   */
  function createConditionCard(condition, count, total, color) {
    const percent = ((count / total) * 100).toFixed(0);
    
    return `
      <div class="condition-card" style="background: linear-gradient(to right, ${color}15, ${color}01); 
           border-left: 3px solid ${color};">
        <div class="condition-value" style="color: ${color};">${count}</div>
        <div class="condition-label" style="color: ${color};">${condition}</div>
        <div class="condition-percent">${percent}%</div>
      </div>
    `;
  }
  
  /**
   * Creates investment section HTML
   */
  function createInvestmentSection(summary) {
    const investments = [
      { label: 'სასწრაფო', amount: summary.urgentInvestment, color: COLORS.INVESTMENT.URGENT },
      { label: 'საშუალოვადიანი', amount: summary.nonUrgentInvestment, color: COLORS.INVESTMENT.NON_URGENT },
      { label: 'გრძელვადიანი', amount: summary.longTermInvestment, color: COLORS.INVESTMENT.LONG_TERM }
    ];
  
    return `
      <div class="summary-section">
        
        <div class="investment-total" style="background: linear-gradient(to right, ${COLORS.PRIMARY}15, ${COLORS.PRIMARY}01); 
             padding: 16px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">საჭირო ინვესტიცია</div>
          <div style="font-size: 30px; font-weight: bold; color: ${COLORS.PRIMARY};">
            ${formatNumber(summary.totalInvestment / 1000000, 2)} მლნ ₾
          </div>
          <div style="font-size: 12px; color: #888; margin-top: 4px;">
            საშუალოდ ${formatNumber(summary.avgInvestmentPerSchool / 1000000, 2)} მლნ ₾ თითო სკოლაზე
          </div>
        </div>
  
        <div class="investment-breakdown">
          ${investments.map(inv => createInvestmentBar(inv, summary.totalInvestment)).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Creates individual investment bar
   */
  function createInvestmentBar(investment, totalInvestment) {
    const width = totalInvestment > 0 ? (investment.amount / totalInvestment * 100) : 0;
    
    return `
      <div class="investment-item">
        <div class="investment-bar" style="width: ${width}%; background: ${investment.color};"></div>
        <div class="investment-details">
          <span class="investment-label">${investment.label}</span>
          <span class="investment-amount">${formatNumber(investment.amount / 1000000, 2)} მლნ ₾</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Creates insights section HTML
   */
  function createInsightsSection(summary) {
    const narrative = generateNarrative(summary);
    
    return `
      <div class="summary-section">
        <h4 style="margin: 15px 0; color: #666666; padding: 10px 0;">
          შემაჯამებელი ანალიზი
        </h4>
        <div class="insights-list">
          <div class="insight-item">
            ${narrative}
          </div>
        </div>
      </div>
    `;
  }
  
/**
 * Generates comprehensive narrative analysis
 */
function generateNarrative(summary) {
  const overcrowdedTotal = summary.occupancyDistribution.overcrowded
  const overcrowdedPercent = Math.round((summary.occupancyDistribution.overcrowded / summary.totalSchools) * 100);
  const poorConditionTotal = (summary.conditionCounts['ჩასანაცვლებელია'] || 0) + 
                             (summary.conditionCounts['ცუდი'] || 0);
  const poorConditionPercent = Math.round((poorConditionTotal / summary.totalSchools) * 100);
  const needsReplacement = summary.conditionCounts['ჩასანაცვლებელია'] || 0;
  
  const accessibilityData = calculateAggregateAccessibility(summary);
  const accessScore = accessibilityData.overallScore;

  // Determine severity levels for each dimension
  const crowdingSeverity = getCrowdingSeverity(overcrowdedPercent);
  const conditionSeverity = getConditionSeverity(poorConditionPercent);
  const accessibilitySeverity = getAccessibilitySeverity(accessScore);

  // Build integrated narrative
  let narrative = buildIntroduction(summary, crowdingSeverity);
  narrative += buildMainChallenges(crowdingSeverity, conditionSeverity, accessibilitySeverity, overcrowdedTotal,
                                   overcrowdedPercent, poorConditionPercent, needsReplacement, accessScore);
  
  if (summary.totalInvestment > 0) {
    narrative += buildInvestmentContext(summary, crowdingSeverity, conditionSeverity, accessibilitySeverity);
  }
  
  narrative += buildRecommendations(crowdingSeverity, conditionSeverity, accessibilitySeverity,
                                    overcrowdedPercent, poorConditionPercent, needsReplacement);

  return narrative;
}

/**
 * Determines severity levels
 */
function getCrowdingSeverity(percent) {
  if (percent > 60) return 'critical';
  if (percent > 30) return 'high';
  if (percent > 0) return 'moderate';
  return 'none';
}

function getConditionSeverity(percent) {
  if (percent > 50) return 'critical';
  if (percent > 25) return 'high';
  if (percent > 0) return 'moderate';
  return 'good';
}

function getAccessibilitySeverity(score) {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 45) return 'moderate';
  if (score >= 20) return 'poor';
  if (score > 0) return 'critical';
  return 'none';
}

/**
 * Builds introduction based on overall situation
 */
function buildIntroduction(summary, crowdingSeverity) {
  const studentsPerSchool = summary.avgStudentsPerSchool;
  
  if (crowdingSeverity === 'critical' || crowdingSeverity === 'high') {
    return `მონიშნულ არეალში არსებობს მნიშვნელოვანი გამოწვევები საჯარო სკოლების ინფრასტრუქტურის ხარისხთან დაკავშირებით. თითო სკოლაში საშუალოდ <strong>${studentsPerSchool}</strong> მოსწავლეა დარეგისტრირებული, რაც განაპირობებს აქ არსებული `;
  } else if (crowdingSeverity === 'moderate') {
    return `ამ არეალში სკოლები საშუალოდ <strong>${studentsPerSchool}</strong> მოსწავლეს ემსახურება. `;
  } else {
    return `ამ არეალში სკოლების დატვირთულობა ოპტიმალურ დონეზეა - საშუალოდ <strong>${studentsPerSchool}</strong> მოსწავლე თითო სკოლაზე. `;
  }
}

/**
 * Builds main challenges section with integrated narrative
 */
function buildMainChallenges(crowdingSeverity, conditionSeverity, accessibilitySeverity, overcrowdedTotal,
                            overcrowdedPercent, poorConditionPercent, poorConditionTotal, needsReplacement, accessScore) {
  let text = '';
  
  // Combine crowding and condition if both are problematic
  if (crowdingSeverity === 'critical' && conditionSeverity === 'critical') {
    text += `გადატვირთულობის კრიტიკულ ზღვარს ემატება შენობების მძიმე მდგომარეობა - ${poorConditionTotal} სკოლა საჭიროებს სრულყოფილ რეაბილიტაციას`;
    if (needsReplacement > 0) {
      text += `, მათ შორის ${needsReplacement} სკოლა სრულ ჩანაცვლებას`;
    }
    text += `. `;
  } else if (crowdingSeverity === 'critical' || crowdingSeverity === 'high') {
    text += `<strong>${overcrowdedTotal} სკოლის</strong> მნიშვნელოვან გადატვირთულობას. `;
    
    if (conditionSeverity === 'critical' || conditionSeverity === 'high') {
      text += `ამას ემატება ინფრასტრუქტურული პრობლემები - ${poorConditionTotal} სკოლა საჭიროებს რეაბილიტაციას`;
      if (needsReplacement > 0) {
        text += `, ${needsReplacement} მათგანი კი სრულ ჩანაცვლებას`;
      }
      text += `. `;
    } else if (conditionSeverity === 'moderate' && poorConditionTotal > 0) {
      text += `შენობების მდგომარეობა ზოგადად დამაკმაყოფილებელია, თუმცა ${poorConditionTotal} სკოლა მოითხოვს რეაბილიტაციას.`;
    }
  } else if (crowdingSeverity === 'moderate') {
    if (conditionSeverity === 'critical' || conditionSeverity === 'high') {
      text += `მართალია, გადატვირთულობა შედარებით შეზღუდულია, მაგრამ ინფრასტრუქტურის მდგომარეობა საყურადღებოა - ${poorConditionTotal} სკოლა საჭიროებს რეაბილიტაციას. `;
    } else {
      text += `გადატვირთულობის და ინფრასტრუქტურის პრობლემები შედარებით ნაკლებად მწვავედ დგას. `;
    }
  } else {
    // No crowding issues
    if (conditionSeverity === 'critical' || conditionSeverity === 'high') {
      text += `გადატვირთულობის პრობლემა არ აღინიშნება, თუმცა შენობების მდგომარეობა საგანგაშოა - ${poorConditionTotal} სკოლა საჭიროებს რეაბილიტაციას. `;
    } else if (conditionSeverity === 'moderate') {
      text += `ზოგადად, ინფრასტრუქტურა დამაკმაყოფილებელ მდგომარეობაშია. `;
    } else {
      text += `ინფრასტრუქტურა კარგ მდგომარეობაშია. `;
    }
  }
  
  // Add accessibility in context
  text += buildAccessibilityInContext(accessibilitySeverity, accessScore, conditionSeverity);
  
  return text;
}

/**
 * Builds accessibility narrative in context with other challenges
 */
function buildAccessibilityInContext(accessibilitySeverity, accessScore, conditionSeverity) {
  switch(accessibilitySeverity) {
    case 'excellent':
      return `<br>აღსანიშნავია, რომ ფიზიკური მისაწვდომობის თვალსაზრისით კარგი მდგომარეობაა. სკოლების უმეტესობა აღჭურვილია შეზღუდული შესაძლებლობის მქონე მოსწავლეთათვის საჭირო ინფრასტრუქტურით. `;
    
    case 'good':
      return `<br>ამ არეალში ფიზიკური მისაწვდომობის შედარებით კარგი მაჩვენებელია, თუმცა, ინკლუზიური გარემოს გასაუმჯობესებლად, საჭიროა გარკვეული ჩარევები. `;
    
    case 'moderate':
      if (conditionSeverity === 'critical' || conditionSeverity === 'high') {
        return `<br>ამას ემატება ფიზიკური მისაწვდომობის პრობლემა. სკოლების მნიშვნელოვანი ნაწილი არ არის აღჭურვილი ადაპტირებული პანდუსებით, ლიფტებითა და საპირფარეშოებით. `;
      } else {
        return `თუმცა, მისაწვდომობის თვალსაზრისით სურათი არათანაბარია. საჭიროა მნიშვნელოვანი ინვესტიციები ფიზიკურად ინკლუზიური გარემოს შესაქმნელად. `;
      }
    
    case 'poor':
      return `<br>განსაკუთრებით პრობლემურია ფიზიკური მისაწვდომობის საკითხი, რადგან სკოლების უმრავლესობა არ არის ადაპტირებული შეზღუდული შესაძლებლობის მქონე მოსწავლეებისთვის. ეს სერიოზული გამოწვევაა განათლებაზე თანასწორი ხელმისაწვდომობის კუთხით. `;
    
    case 'critical':
      return `<br>უაღრესად პრობლემურია ფიზიკური მისაწვდომობის საკითხი. მოცემულ არეალში არსებული სკოლების უმეტესობა მიუწვდომელია შეზღუდული მობილობის მქონე მოსწავლეთათვის. საჭიროა დაუყოვნებელი და მასშტაბური ინფრასტრუქტურული ჩარევა ინკლუზიური გარემოს შესაქმნელად. `;
    
    default:
      return `<br>მისაწვდომობის კუთხით, სიტუაცია განსაკუთრებულად კრიტიკულია. არცერთ სკოლას არ აქვს ისეთი ადაპტირებული ინფრასტრუქტურის ისეთი საბაზისო ელემენტები, როგორებიცაა პანდუსები, ლიფტები თუ საპირფარეშოები. აუცილებელია ამ ინფრასტრუქტურის სრულყოფილად შექმნა, რათა მოსწავლეებმა მიიღონ თანაბარი წვდომა განათლებაზე. `;
  }
}

/**
 * Builds investment context connecting to challenges
 */
function buildInvestmentContext(summary, crowdingSeverity, conditionSeverity, accessibilitySeverity) {
  const urgentPercent = summary.totalInvestment > 0 
    ? Math.round((summary.urgentInvestment / summary.totalInvestment * 100)) 
    : 0;
  const investmentPerStudent = summary.totalStudents > 0 && summary.urgentInvestment > 0 
    ? Math.round(summary.urgentInvestment / summary.totalStudents) 
    : 0;

  let text = '';
  
  // Determine if situation is urgent based on multiple factors
  const criticalFactors = [crowdingSeverity, conditionSeverity, accessibilitySeverity]
    .filter(s => s === 'critical').length;
  
  if (criticalFactors >= 2) {
    text += `ამ საკითხების მოსაგვარებლად `;
  } else if (crowdingSeverity === 'critical' || conditionSeverity === 'critical') {
    text += `ამ მძიმე სიტუაციის გამოსასწორებლად `;
  } else {
    text += `სასწავლო გარემოს გასაუმჯობესებლად `;
  }
  
  text += `საჭიროა <strong>${formatNumber(summary.urgentInvestment / 1000000, 1)} მლნ ₾</strong> ინვესტიცია`;
  
  if (urgentPercent > 60) {
    text += `, რომლის <strong>${urgentPercent}%</strong> სასწრაფოა`;
  }
  
  if (investmentPerStudent > 0) {
    text += ` (საშუალოდ <strong>${formatNumber(investmentPerStudent)} ₾</strong> თითო მოსწავლეზე)`;
  }
  
  text += `. `;
  
  return text;
}

/**
 * Builds comprehensive recommendations
 */
function buildRecommendations(crowdingSeverity, conditionSeverity, accessibilitySeverity,
                             overcrowdedPercent, poorConditionPercent, needsReplacement) {
  let text = '<br>';
  
  // Determine recommendation type
  const severityScore = 
    (crowdingSeverity === 'critical' ? 3 : crowdingSeverity === 'high' ? 2 : crowdingSeverity === 'moderate' ? 1 : 0) +
    (conditionSeverity === 'critical' ? 3 : conditionSeverity === 'high' ? 2 : conditionSeverity === 'moderate' ? 1 : 0) +
    (accessibilitySeverity === 'critical' ? 3 : accessibilitySeverity === 'poor' ? 2 : accessibilitySeverity === 'moderate' ? 1 : 0);
  
  if (severityScore >= 7) {
    text += 'აუცილებელია ';
    
    let actions = [];
    if (crowdingSeverity === 'critical') actions.push('ახალი სკოლების მშენებლობა');
    if (conditionSeverity === 'critical') {
      if (needsReplacement > 0) {
        actions.push(`${needsReplacement} სკოლის სრული ჩანაცვლება`);
      }
      actions.push('მასშტაბური რეაბილიტაცია');
    }
    if (accessibilitySeverity === 'critical' || accessibilitySeverity === 'poor') {
      actions.push('ინფრასტრუქტურის სრული განახლება');
    }
    
    text += actions.join(', ') + ' - ეს ნაბიჯები აუცილებელია ქალაქის ამ ნაწილში ხარისხიანი და თანასწორი სასკოლო განათლების უზრუნველსაყოფად.';
    
  } else if (severityScore >= 4) {
    text += 'მთავარი რეკომენდაცია - ';
    
    let priorities = [];
    if (crowdingSeverity === 'critical' || crowdingSeverity === 'high') {
      priorities.push('გადატვირთულობის შესამცირებლად აუცილებელია ახალი სკოლების მშენებლობა');
    }
    if (conditionSeverity === 'critical' || conditionSeverity === 'high') {
      priorities.push('არსებული ინფრასტრუქტურის სრულყოფილი რეაბილიტაცია');
    }
    if (accessibilitySeverity === 'poor' || accessibilitySeverity === 'moderate') {
      priorities.push('ინკლუზიური გარემოს შექმნა პანდუსების, ლიფტებისა და ადაპტირებული საპირფარეშოების მოწყობით');
    }
    
    text += priorities.join(', ასევე ') + '.';
    
  } else if (severityScore > 0) {
    text += 'ძირითადი რეკომენდაცია - ';
    text += 'იდენტიფიცირებული ხარვეზების აღმოსაფხვრელად საჭიროა მიზანმიმართული საინვესტიციო პროგრამის შემუშავება, ';
    
    if (conditionSeverity === 'moderate') text += 'რომელიც უზრუნველყოფს შენობების ხარისხიან რეაბილიტაციას';
    if (accessibilitySeverity === 'moderate') {
      if (conditionSeverity === 'moderate') text += ' და ';
      text += 'ინკლუზიური ინფრასტრუქტურის გაუმჯობესებას ';
    }
    text += '.';
    
  } else {
    text += 'დასკვნის სახით, შეგვიძლია აღვნიშნოთ, რომ ';
    text += 'ამ არეალში სკოლების ზოგადი მდგომარეობა დამაკმაყოფილებელია. ';
    
    if (accessibilitySeverity === 'good' || accessibilitySeverity === 'excellent') {
      text += 'ეს არეალი განსაკუთრებულად მაღალი ინკლუზიურობით გამოირჩევა. ';
    }
    
    text += 'რეკომენდირებულია ხარისხიანი მოვლა-პატრონობა და მიმდინარე გაუმჯობესებები ოპტიმალური სასწავლო გარემოს შესანარჩუნებლად.';
  }
  
  return text;
}
  
  /**
   * Shows the results section
   */
  function showResultsSection() {
    const resultsSection = document.getElementById('schoolSummaryResults');
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
  }
  
  // ==================== INTEGRATION ====================
  
  /**
   * Main integration function - analyzes and displays school summary
   */
  function integrateSchoolSummary(schoolsInIsochrone) {
    try {
      console.log('=== INTEGRATION START ===');
      console.log('Total schools received:', schoolsInIsochrone?.length);
      
      if (schoolsInIsochrone && schoolsInIsochrone.length > 0) {
        console.log('First school sample:', schoolsInIsochrone[0]);
        console.log('First school properties:', schoolsInIsochrone[0]?.properties);
        console.log('Accessibility fields (correct names):', {
          Ramp: schoolsInIsochrone[0]?.properties?.['Ramp'],
          'Adapted elevator': schoolsInIsochrone[0]?.properties?.['Adapted elevator'],
          'Adapted WC': schoolsInIsochrone[0]?.properties?.['Adapted WC']
        });
      }
      
      const summary = analyzeSchoolsInIsochrone(schoolsInIsochrone);
      console.log('Summary accessibility scores:', summary?.accessibilityScores);
      displaySchoolSummary(summary);
    } catch (error) {
      console.error('Error integrating school summary:', error);
      const container = document.getElementById('schoolSummaryContent');
      if (container) {
        container.innerHTML = '<p style="color: #ef4444; padding: 20px;">შეცდომა მონაცემების დამუშავებისას</p>';
      }
    }
  }
  
  // ==================== EXPORTS ====================
  
  if (typeof window !== 'undefined') {
    window.analyzeSchoolsInIsochrone = analyzeSchoolsInIsochrone;
    window.displaySchoolSummary = displaySchoolSummary;
    window.integrateSchoolSummary = integrateSchoolSummary;
  }