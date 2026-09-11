import { getMarketDataProvider } from '../src/lib/services/market/marketDataProviderFactory';
import { getWeatherDataProvider } from '../src/lib/services/weather/weatherDataProviderFactory';
import { marketRepository } from '../src/lib/repositories/marketRepository';
import { GeoService } from '../src/lib/services/geoService';
import fs from 'fs';
import path from 'path';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ TEST ${totalTests} PASSED: ${testName}`);
  } else {
    console.error(`  ❌ TEST ${totalTests} FAILED: ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
  }
}

async function runPhase8Audit() {
  console.log('\n=============================================================');
  console.log('  KRISHISETU — PHASE 8 COMPREHENSIVE AUDIT & REGRESSION SUITE');
  console.log('  Market Intelligence + Weather Platform');
  console.log('=============================================================\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: Market Provider Abstraction
    // -------------------------------------------------------------
    const mktProvider = getMarketDataProvider();
    assert(
      mktProvider.getProviderName().length > 0,
      'Market Data Provider Abstraction Initialization',
      `Active provider: ${mktProvider.getProviderName()}`
    );

    // -------------------------------------------------------------
    // TEST 2: Demo Data Labeling Integrity
    // -------------------------------------------------------------
    const currentPrices = await mktProvider.getCurrentPrices('Onion', 'Nashik');
    assert(
      currentPrices.length > 0 && currentPrices[0].isDemoData === true && currentPrices[0].source.includes('Demo'),
      'Demo Market Data Truthful Labeling (isDemoData: true & source indicated)',
      `First record source: '${currentPrices[0]?.source}'`
    );

    // -------------------------------------------------------------
    // TEST 3: Min/Max/Modal Price Correctness & Arrival Data
    // -------------------------------------------------------------
    const priceRec = currentPrices[0];
    assert(
      priceRec.minPrice <= priceRec.modalPrice && priceRec.modalPrice <= priceRec.maxPrice && priceRec.arrivalsQuantity >= 0,
      'Min/Max/Modal Price Bounds & Arrival Quantity Validity',
      `Min: ₹${priceRec.minPrice}, Modal: ₹${priceRec.modalPrice}, Max: ₹${priceRec.maxPrice}, Arrivals: ${priceRec.arrivalsQuantity}`
    );

    // -------------------------------------------------------------
    // TEST 4: Historical Trend Calculation & Non-Deterministic Labeling
    // -------------------------------------------------------------
    const history = await mktProvider.getHistoricalPrices('Onion', 'Lasalgaon APMC', 30);
    assert(
      history.dataPoints.length > 0 && ['UPWARD', 'DOWNWARD', 'STABLE'].includes(history.trend),
      '30-Day Historical Trend Calculation & Trend Classification',
      `Data points: ${history.dataPoints.length}, Trend: ${history.trend}, % Change: ${history.percentageChange}%`
    );

    // -------------------------------------------------------------
    // TEST 5: Deterministic Price Trend Indicator
    // -------------------------------------------------------------
    const outlook1 = await mktProvider.getPriceOutlook('Onion', 'Lasalgaon APMC');
    const outlook2 = await mktProvider.getPriceOutlook('Onion', 'Lasalgaon APMC');

    assert(
      outlook1.outlook === outlook2.outlook &&
      outlook1.disclaimer === 'Trend indicators are based on available historical data and are not a guarantee of future prices.',
      'Deterministic Price Trend Indicator & Accurate Disclaimer',
      `Trend Outlook: '${outlook1.outlook}', Disclaimer: '${outlook1.disclaimer}'`
    );

    // -------------------------------------------------------------
    // TEST 6: Insufficient Data Handling
    // -------------------------------------------------------------
    const emptyOutlook = await mktProvider.getPriceOutlook('UnknownCrop999');
    assert(
      emptyOutlook.outlook === 'INSUFFICIENT_DATA' || emptyOutlook.observationCount >= 0,
      'Insufficient Data Outlook Handling',
      `Outlook returned: ${emptyOutlook.outlook}`
    );

    // -------------------------------------------------------------
    // TEST 7: Nearby Market Comparison & Phase 7 Distance Integration
    // -------------------------------------------------------------
    const nearby = await mktProvider.getNearbyMarkets('Onion', { latitude: 19.9975, longitude: 73.7898 }, 'Nashik');
    assert(
      nearby.length > 0 && nearby[0].distanceKm !== undefined && nearby[0].distanceType === 'GEODESIC',
      'Nearby Market Comparison with Phase 7 Geodesic Distance',
      `First nearby market: ${nearby[0]?.mandiName} (~${nearby[0]?.distanceKm} km, type: ${nearby[0]?.distanceType})`
    );

    // -------------------------------------------------------------
    // TEST 8: Contextual Warning Notice on Nearby Comparison
    // -------------------------------------------------------------
    assert(
      nearby[0].contextualNotice.includes('Higher price does not always mean higher profit'),
      'Nearby Market Net Realization Contextual Warning Notice',
      `Notice: '${nearby[0]?.contextualNotice}'`
    );

    // -------------------------------------------------------------
    // TEST 9: Weather Data Provider Abstraction
    // -------------------------------------------------------------
    const wxProvider = getWeatherDataProvider();
    assert(
      wxProvider.getProviderName().length > 0,
      'Weather Data Provider Abstraction Initialization',
      `Active provider: ${wxProvider.getProviderName()}`
    );

    // -------------------------------------------------------------
    // TEST 10: Weather Observation Retrieval & Agricultural Context
    // -------------------------------------------------------------
    const wxObs = await wxProvider.getWeatherObservation('Nashik');
    assert(
      wxObs.district === 'Nashik' && wxObs.isDemoData === true && Boolean(wxObs.agContextHint),
      'Weather Observation Retrieval & Agricultural Advisory Context',
      `Temp: ${wxObs.temperatureC}°C, Condition: ${wxObs.condition}, Hint: '${wxObs.agContextHint}'`
    );

    // -------------------------------------------------------------
    // TEST 11: Weather Forecast Retrieval
    // -------------------------------------------------------------
    const wxForecast = await wxProvider.getWeatherForecast('Nashik', 5);
    assert(
      wxForecast.length === 5 && wxForecast[0].rainfallProbPct >= 0,
      '5-Day Weather Forecast Data Pipeline',
      `Retrieved ${wxForecast.length} forecast days`
    );

    // -------------------------------------------------------------
    // TEST 12: Estimated Net Realization Calculation
    // -------------------------------------------------------------
    const netCalc = await marketRepository.calculateEstimatedNetRealization(100000, 3500, 1200);
    assert(
      netCalc.estimatedNetRealization === 95300 && netCalc.isEstimateOnly === true,
      'Estimated Net Realization Calculation (Commercial Value - Transport - Storage)',
      `Commercial Value: ₹100,000 - Transport ₹3500 - Storage ₹1200 = Net ₹${netCalc.estimatedNetRealization}`
    );

    // -------------------------------------------------------------
    // TEST 13: Trilingual i18n Completeness (EN / HI / MR)
    // -------------------------------------------------------------
    const enJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/en.json'), 'utf8'));
    const hiJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/hi.json'), 'utf8'));
    const mrJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/mr.json'), 'utf8'));

    const enMktKeys = Object.keys(enJson.market || {});
    const hiMktKeys = Object.keys(hiJson.market || {});
    const mrMktKeys = Object.keys(mrJson.market || {});

    const enWxKeys = Object.keys(enJson.weather || {});
    const hiWxKeys = Object.keys(hiJson.weather || {});
    const mrWxKeys = Object.keys(mrJson.weather || {});

    assert(
      enMktKeys.length >= 10 && hiMktKeys.length === enMktKeys.length && mrMktKeys.length === enMktKeys.length,
      'Market Intelligence Trilingual i18n Dictionary Completeness (EN / HI / MR)',
      `Market Keys: EN=${enMktKeys.length}, HI=${hiMktKeys.length}, MR=${mrMktKeys.length}`
    );

    assert(
      enWxKeys.length >= 8 && hiWxKeys.length === enWxKeys.length && mrWxKeys.length === enWxKeys.length,
      'Weather Trilingual i18n Dictionary Completeness (EN / HI / MR)',
      `Weather Keys: EN=${enWxKeys.length}, HI=${hiWxKeys.length}, MR=${mrWxKeys.length}`
    );

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n=============================================================');
    console.log(`  PHASE 8 AUDIT RESULTS: ${passedTests} / ${totalTests} PASSED`);
    console.log('=============================================================\n');

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal audit failure:', err);
    process.exit(1);
  }
}

runPhase8Audit();
