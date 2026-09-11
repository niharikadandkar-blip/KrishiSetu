import { db } from '../src/lib/db';
import { lotRepository } from '../src/lib/repositories/lotRepository';
import { biddingRepository } from '../src/lib/repositories/biddingRepository';
import { prebookingRepository } from '../src/lib/repositories/prebookingRepository';
import { savedListingRepository } from '../src/lib/repositories/savedListingRepository';
import { buyerRequirementService } from '../src/lib/services/buyerRequirementService';

async function runPhase3Audit() {
  console.log('====================================================');
  console.log('   KRISHISETU PHASE 3 FINAL AUDIT & E2E INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, failureDetail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (failureDetail) console.error(`   Details: ${failureDetail}`);
      failed++;
    }
  }

  try {
    // Setup test users in dev database
    const farmerA = await db.user.upsert({
      where: { mobile: '9876543210' },
      update: {},
      create: { id: 'test-farmer-a', name: 'Farmer A (Owner)', mobile: '9876543210', role: 'FARMER' },
    });

    const farmerB = await db.user.upsert({
      where: { mobile: '9876543211' },
      update: {},
      create: { id: 'test-farmer-b', name: 'Farmer B (Attacker)', mobile: '9876543211', role: 'FARMER' },
    });

    const buyerA = await db.user.upsert({
      where: { mobile: '9876543212' },
      update: {},
      create: { id: 'test-buyer-a', name: 'Buyer A', mobile: '9876543212', role: 'BUYER' },
    });

    // -------------------------------------------------------------
    // TEST 1: FARMER LISTING CREATION & LIFECYCLE (DRAFT -> PUBLISHED -> PAUSED -> PUBLISHED)
    // -------------------------------------------------------------
    console.log('\n--- 1. FARMER LISTING LIFECYCLE TEST ---');
    const newLot = await lotRepository.createLot({
      farmerId: farmerA.id,
      cropName: 'Audit Onion',
      variety: 'Red Globe',
      quantityAvailable: 100,
      unit: 'Quintal',
      askPricePerUnit: 2200,
      expectedHarvestDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      publicVillage: 'Manjari',
      publicTaluka: 'Haveli',
      publicDistrict: 'Pune',
      latitude: 18.5204,
      longitude: 73.8567,
      farmAddress: '712 Survey No. 45, Manjari Farm',
    });

    assert(newLot.status === 'PUBLISHED', 'New produce lot defaults to PUBLISHED status');

    // Pause listing
    const pausedLot = await lotRepository.transitionStatus(newLot.id, farmerA.id, 'PAUSED');
    assert(pausedLot.status === 'PAUSED', 'Listing transitioned from PUBLISHED -> PAUSED');

    // Resume listing
    const resumedLot = await lotRepository.transitionStatus(newLot.id, farmerA.id, 'PUBLISHED');
    assert(resumedLot.status === 'PUBLISHED', 'Listing transitioned from PAUSED -> PUBLISHED');


    // -------------------------------------------------------------
    // TEST 2: SECURITY & AUTHORIZATION (IDOR CHECK)
    // -------------------------------------------------------------
    console.log('\n--- 2. SECURITY & AUTHORIZATION (IDOR CHECK) ---');
    let idorEditBlocked = false;
    try {
      await lotRepository.updateLot(newLot.id, farmerB.id, { askPricePerUnit: 1000 });
    } catch (err: any) {
      if (err.message.includes('Forbidden')) idorEditBlocked = true;
    }
    assert(idorEditBlocked, 'Farmer B cannot edit Farmer A listing (IDOR Blocked)');

    let idorStatusBlocked = false;
    try {
      await lotRepository.transitionStatus(newLot.id, farmerB.id, 'PAUSED');
    } catch (err: any) {
      if (err.message.includes('Forbidden')) idorStatusBlocked = true;
    }
    assert(idorStatusBlocked, 'Farmer B cannot transition status of Farmer A listing (IDOR Blocked)');


    // -------------------------------------------------------------
    // TEST 3: LOCATION PRIVACY PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- 3. LOCATION PRIVACY PROTECTION TEST ---');
    const publicView = await lotRepository.findLotById(newLot.id, buyerA.id);
    assert(
      publicView?.latitude === null && publicView?.longitude === null && publicView?.farmAddress === null,
      'Unauthenticated/unrelated buyers receive null for exact GPS & farm address'
    );

    const ownerView = await lotRepository.findLotById(newLot.id, farmerA.id);
    assert(
      ownerView?.latitude === 18.5204 && ownerView?.farmAddress === '712 Survey No. 45, Manjari Farm',
      'Lot owner receives exact protected location & address'
    );


    // -------------------------------------------------------------
    // TEST 4: STATE INTEGRITY & ACTIVE COMMITMENT GUARD
    // -------------------------------------------------------------
    console.log('\n--- 4. LOT STATE INTEGRITY & ACTIVE COMMITMENT GUARD TEST ---');
    const bid = await biddingRepository.createBid({
      lotId: newLot.id,
      bidderId: buyerA.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 2200,
      quantity: 50,
      paymentTermsDays: 0,
      idempotencyKey: `audit-bid-${Date.now()}`,
    });

    await biddingRepository.respondToBid({
      bidId: bid.id,
      userId: farmerA.id,
      action: 'ACCEPT',
    });

    let commitmentGuardTriggered = false;
    try {
      await lotRepository.transitionStatus(newLot.id, farmerA.id, 'PAUSED');
    } catch (err: any) {
      if (err.message.includes('Cannot transition listing') && err.message.includes('accepted bids')) {
        commitmentGuardTriggered = true;
      }
    }
    assert(
      commitmentGuardTriggered,
      'State transition to PAUSED blocked when active accepted bids exist'
    );


    // -------------------------------------------------------------
    // TEST 5: DETERMINISTIC EXPLAINABLE MATCHING ENGINE
    // -------------------------------------------------------------
    console.log('\n--- 5. EXPLAINABLE BUYER REQUIREMENT MATCHING ENGINE TEST ---');
    const rfq = {
      targetCrop: 'Audit Onion',
      requiredQuantity: 50,
      budgetPricePerUnit: 2500,
      deliveryDistrict: 'Pune',
      requiredByDate: new Date(Date.now() + 10 * 86400000),
      latitude: 18.5204,
      longitude: 73.8567,
    };

    const matchResult = buyerRequirementService.calculateLotMatchScore(rfq, {
      id: newLot.id,
      cropName: newLot.cropName,
      variety: newLot.variety,
      quantityAvailable: newLot.quantityAvailable,
      askPricePerUnit: newLot.askPricePerUnit,
      expectedHarvestDate: newLot.expectedHarvestDate,
      publicDistrict: newLot.publicDistrict,
      latitude: newLot.latitude,
      longitude: newLot.longitude,
    });

    assert(matchResult.totalScore === 100, `Match score correctly calculated: ${matchResult.totalScore}%`);
    assert(matchResult.factors.length === 5, 'Factor score breakdown contains exactly 5 explainable factors');
    assert(
      matchResult.factors.every((f) => f.explanation && typeof f.score === 'number'),
      'Every factor breakdown contains human-readable explanation and score'
    );


    // -------------------------------------------------------------
    // TEST 6: SAVED LISTINGS IDEMPOTENCY
    // -------------------------------------------------------------
    console.log('\n--- 6. SAVED LISTINGS IDEMPOTENCY TEST ---');
    const save1 = await savedListingRepository.toggleSavedListing(buyerA.id, newLot.id);
    assert(save1.saved === true, 'Saved listing bookmark toggle returns saved: true');

    const save2 = await savedListingRepository.toggleSavedListing(buyerA.id, newLot.id);
    assert(save2.saved === false, 'Saved listing bookmark toggle returns saved: false on second call (unsave)');

    // Cleanup test records
    await db.lot.delete({ where: { id: newLot.id } });

    console.log('\n====================================================');
    console.log(`   AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Fatal audit runner error:', error);
    process.exit(1);
  }
}

runPhase3Audit();
