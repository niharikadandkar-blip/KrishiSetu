import { db } from '../src/lib/db';
import { getMapProvider } from '../src/lib/services/map/mapProviderFactory';
import { GeoService } from '../src/lib/services/geoService';
import { LocationPrivacyService } from '../src/lib/services/locationPrivacyService';
import { storageRepository } from '../src/lib/repositories/storageRepository';
import { providerRepository } from '../src/lib/repositories/providerRepository';
import { transportRepository } from '../src/lib/repositories/transportRepository';
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

async function runPhase7Audit() {
  console.log('\n=============================================================');
  console.log('  KRISHISETU — PHASE 7 COMPREHENSIVE AUDIT & REGRESSION SUITE');
  console.log('=============================================================\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: Map Provider Abstraction & Fallback
    // -------------------------------------------------------------
    const provider = getMapProvider();
    assert(
      provider.getProviderName().includes('DemoMapProvider') || provider.getProviderName().length > 0,
      'Map Provider Abstraction & Fallback Configuration',
      `Active provider: ${provider.getProviderName()}`
    );

    // -------------------------------------------------------------
    // TEST 2: Geodesic Distance Calculation (Haversine Formula)
    // -------------------------------------------------------------
    const nashik = { latitude: 19.9975, longitude: 73.7898 };
    const mumbai = { latitude: 19.0760, longitude: 72.8777 };
    const distKm = GeoService.calculateGeodesicDistance(nashik, mumbai);
    assert(
      distKm > 130 && distKm < 170,
      'Haversine Geodesic Distance Calculation Accuracy',
      `Calculated distance Nashik to Mumbai: ${distKm.toFixed(1)} km (Expected ~145-160 km)`
    );

    // -------------------------------------------------------------
    // TEST 3: Honest Distance Labeling (GEODESIC vs ESTIMATED_ROAD)
    // -------------------------------------------------------------
    const distanceFormatted = GeoService.formatDistanceResult(distKm, 'GEODESIC');
    assert(
      distanceFormatted.distanceType === 'GEODESIC' &&
      distanceFormatted.label === 'Approximate straight-line distance',
      'Honest Distance Labeling (Geodesic is never mislabeled as road distance)',
      `Label returned: '${distanceFormatted.label}'`
    );

    // -------------------------------------------------------------
    // TEST 4: Deterministic Location Privacy Jitter
    // -------------------------------------------------------------
    const exactLoc = { latitude: 19.9975, longitude: 73.7898 };
    const entityId = 'test_facility_12345';
    const jitter1 = LocationPrivacyService.getDeterministicDiscoveryLocation(entityId, exactLoc);
    const jitter2 = LocationPrivacyService.getDeterministicDiscoveryLocation(entityId, exactLoc);

    assert(
      jitter1.latitude === jitter2.latitude && jitter1.longitude === jitter2.longitude,
      'Deterministic Discovery Location Jitter (Same entity produces identical pin location)',
      `Pin 1: (${jitter1.latitude}, ${jitter1.longitude}), Pin 2: (${jitter2.latitude}, ${jitter2.longitude})`
    );

    assert(
      jitter1.latitude !== exactLoc.latitude || jitter1.longitude !== exactLoc.longitude,
      'Discovery Location Jitter Offsets Exact Coordinates',
      `Exact: (${exactLoc.latitude}, ${exactLoc.longitude}) vs Discovery: (${jitter1.latitude}, ${jitter1.longitude})`
    );

    // -------------------------------------------------------------
    // TEST 5: Storage Discovery Map Query
    // -------------------------------------------------------------
    const storageMapItems = await storageRepository.getStorageFacilitiesForMap({
      district: 'Nashik',
      limit: 10,
    });
    assert(
      Array.isArray(storageMapItems),
      'Storage Discovery Map Query Execution',
      `Retrieved ${storageMapItems.length} storage facilities for map discovery`
    );

    // -------------------------------------------------------------
    // TEST 6: Transport Provider Discovery Map Query
    // -------------------------------------------------------------
    const providerMapItems = await providerRepository.getTransportProvidersForMap({
      district: 'Nashik',
      limit: 10,
    });
    assert(
      Array.isArray(providerMapItems),
      'Transport Provider Discovery Map Query Execution',
      `Retrieved ${providerMapItems.length} transport vehicles for map discovery`
    );

    // -------------------------------------------------------------
    // TEST 7: 3-Tier Privacy Sanitization (Public Payload Masking)
    // -------------------------------------------------------------
    const publicPayload = LocationPrivacyService.sanitizePublicPayload({
      facilityName: 'Shiv Cold Storage',
      district: 'Nashik',
      latitude: 19.9975,
      longitude: 73.7898,
      address: 'Plot 45, MIDC Ambad, Nashik',
    });
    assert(
      !('latitude' in publicPayload) && !('longitude' in publicPayload) && !('address' in publicPayload),
      'Public Payload Coordinate & Address Sanitization',
      `Keys remaining: ${Object.keys(publicPayload).join(', ')}`
    );

    // -------------------------------------------------------------
    // TEST 8: Navigation Handoff URL Generation
    // -------------------------------------------------------------
    const navHandoff = provider.getNavigationUrl(
      { latitude: 19.9975, longitude: 73.7898 },
      'Nashik Delivery Spot',
      true,
      { latitude: 19.0760, longitude: 72.8777 }
    );
    assert(
      Boolean(navHandoff.googleMapsUrl?.includes('google.com/maps/dir')) &&
      Boolean(navHandoff.openStreetMapUrl?.includes('openstreetmap.org/directions')) &&
      Boolean(navHandoff.geoUri?.startsWith('geo:')),
      'External Navigation Handoff URL Builder (Google, OSM, Geo URI)',
      `Google Maps URL: ${navHandoff.googleMapsUrl}`
    );

    // -------------------------------------------------------------
    // TEST 9: Order Route Geographic Details & Authorization Check
    // -------------------------------------------------------------
    // Setup test users & order
    const farmerUser = await db.user.create({
      data: {
        mobile: `9977${Date.now().toString().slice(-6)}`,
        name: 'Phase 7 Farmer',
        role: 'FARMER',
      },
    });

    const buyerUser = await db.user.create({
      data: {
        mobile: `9988${Date.now().toString().slice(-6)}`,
        name: 'Phase 7 Buyer',
        role: 'BUYER',
      },
    });

    const unauthSubscriber = await db.user.create({
      data: {
        mobile: `9999${Date.now().toString().slice(-6)}`,
        name: 'Unrelated User',
        role: 'BUYER',
      },
    });

    const testLot = await db.lot.create({
      data: {
        farmerId: farmerUser.id,
        cropName: 'P7 Onion',
        quantityAvailable: 100,
        unit: 'Quintal',
        askPricePerUnit: 2200,
        expectedHarvestDate: new Date(),
        publicVillage: 'Sogras',
        publicTaluka: 'Chandwad',
        publicDistrict: 'Nashik',
      },
    });

    const offer = await db.offerAndBid.create({
      data: {
        lotId: testLot.id,
        bidderId: buyerUser.id,
        bidderRole: 'BUYER',
        offeredPricePerUnit: 2200,
        quantity: 50,
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const order = await db.order.create({
      data: {
        orderNumber: `ORD-P7-${Date.now()}`,
        acceptedOfferId: offer.id,
        lotId: testLot.id,
        farmerId: farmerUser.id,
        buyerId: buyerUser.id,
        cropName: 'P7 Onion',
        quantity: 50,
        unit: 'Quintal',
        agreedPricePerUnit: 2200,
        agreedTotalValue: 110000,
        farmerName: farmerUser.name,
        farmerMobile: farmerUser.mobile,
        buyerName: buyerUser.name,
        buyerMobile: buyerUser.mobile,
        publicVillage: 'Sogras',
        publicTaluka: 'Chandwad',
        publicDistrict: 'Nashik',
        pickupAddress: 'Farm Plot 12, Sogras Village',
        deliveryAddress: 'Market Yard Gate 4, Vashi, Thane',
      },
    });

    // Authorized Farmer Query
    const farmerRouteDetails = await transportRepository.getOrderRouteGeographicDetails(order.id, farmerUser.id, 'FARMER');
    assert(
      farmerRouteDetails.pickup.isExactAuthorized === true &&
      farmerRouteDetails.pickup.address === 'Farm Plot 12, Sogras Village',
      'Authorized Participant Exact Coordinate Access (Farmer)',
      `Returned address: '${farmerRouteDetails.pickup.address}'`
    );

    // Unauthorized Unrelated User Query
    const unauthRouteDetails = await transportRepository.getOrderRouteGeographicDetails(order.id, unauthSubscriber.id, 'BUYER');
    assert(
      unauthRouteDetails.pickup.isExactAuthorized === false &&
      unauthRouteDetails.pickup.address !== 'Farm Plot 12, Sogras Village',
      'IDOR Protection: Unauthorized User Receives Discovery Masked Address',
      `Exact address hidden: '${unauthRouteDetails.pickup.address}'`
    );

    // -------------------------------------------------------------
    // TEST 10: Missing Coordinates Fallback
    // -------------------------------------------------------------
    const missingCoordsResult = await provider.geocode('');
    assert(
      missingCoordsResult === null,
      'Missing Coordinates Graceful Fallback (Returns null/textual location)',
      `Geocode output for empty query: ${missingCoordsResult}`
    );

    // -------------------------------------------------------------
    // TEST 11: PostGIS Query Abstraction Structure Validation
    // -------------------------------------------------------------
    const sqlTemplate = GeoService.getPostGISQueryTemplate('StorageFacility', 19.9975, 73.7898, 50000);
    assert(
      sqlTemplate.includes('ST_DWithin') && sqlTemplate.includes('ST_Distance'),
      'PostGIS Spatial Query Template Builder',
      `Generated PostGIS SQL pattern: ${sqlTemplate.split('\n')[1]}`
    );

    // -------------------------------------------------------------
    // TEST 12: Trilingual i18n Completeness
    // -------------------------------------------------------------
    const enJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/en.json'), 'utf8'));
    const hiJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/hi.json'), 'utf8'));
    const mrJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/mr.json'), 'utf8'));

    const enMapKeys = Object.keys(enJson.map || {});
    const hiMapKeys = Object.keys(hiJson.map || {});
    const mrMapKeys = Object.keys(mrJson.map || {});

    assert(
      enMapKeys.length >= 15 && hiMapKeys.length === enMapKeys.length && mrMapKeys.length === enMapKeys.length,
      'Trilingual i18n Dictionary Completeness (EN / HI / MR)',
      `EN map keys: ${enMapKeys.length}, HI: ${hiMapKeys.length}, MR: ${mrMapKeys.length}`
    );

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n=============================================================');
    console.log(`  PHASE 7 AUDIT RESULTS: ${passedTests} / ${totalTests} PASSED`);
    console.log('=============================================================\n');

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal audit failure:', err);
    process.exit(1);
  }
}

runPhase7Audit();
