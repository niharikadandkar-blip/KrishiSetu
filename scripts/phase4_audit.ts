import { db } from '../src/lib/db';
import { biddingRepository } from '../src/lib/repositories/biddingRepository';
import { lotRepository } from '../src/lib/repositories/lotRepository';

async function runPhase4Audit() {
  console.log('===============================================================');
  console.log('KRISHISETU — PHASE 4 VERIFICATION AUDIT & INTEGRATION TEST');
  console.log('Fixed-Price Selling, Offers, Bidding & Counter-Offer Engine');
  console.log('===============================================================\n');

  let testPassedCount = 0;
  let testFailedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       ${detail}`);
      testPassedCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       ERROR: ${detail}`);
      testFailedCount++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. SETUP AUDIT USERS
    // -------------------------------------------------------------------------
    console.log('1. Setting up test users (Farmer, Buyer 1, Buyer 2, Unauthorized User)...');
    
    // Clean up existing audit users if rerun
    await db.user.deleteMany({
      where: {
        mobile: { in: ['9876543210', '9123456789', '9111122222', '9998887776'] }
      }
    });

    const auditFarmer = await db.user.create({
      data: {
        name: 'Ramesh Patil (Audit Farmer)',
        mobile: '9876543210',
        role: 'FARMER',
        language: 'mr',
        mobileVerified: true,
        profileVerified: true,
        location: {
          create: {
            state: 'Maharashtra',
            district: 'Nashik',
            taluka: 'Niphad',
            village: 'Pimplegaon',
            latitude: 20.08,
            longitude: 74.01,
          }
        }
      }
    });

    const auditBuyer1 = await db.user.create({
      data: {
        name: 'Suresh Shah (Audit Buyer 1)',
        mobile: '9123456789',
        role: 'BUYER',
        language: 'en',
        mobileVerified: true,
        profileVerified: true,
        location: {
          create: {
            state: 'Maharashtra',
            district: 'Mumbai',
            taluka: 'APMC Vashi',
            village: 'Vashi',
            latitude: 19.07,
            longitude: 72.99,
          }
        }
      }
    });

    const auditBuyer2 = await db.user.create({
      data: {
        name: 'Anil Traders (Audit Buyer 2)',
        mobile: '9111122222',
        role: 'BUYER',
        language: 'hi',
        mobileVerified: true,
        profileVerified: true,
        location: {
          create: {
            state: 'Maharashtra',
            district: 'Pune',
            taluka: 'Haveli',
            village: 'Market Yard',
            latitude: 18.52,
            longitude: 73.85,
          }
        }
      }
    });

    const auditUnauthorizedUser = await db.user.create({
      data: {
        name: 'Unauthorized Stranger',
        mobile: '9998887776',
        role: 'BUYER',
        language: 'mr',
        mobileVerified: true,
        profileVerified: false,
        location: {
          create: {
            state: 'Maharashtra',
            district: 'Thane',
            taluka: 'Thane',
            village: 'Thane West',
            latitude: 19.21,
            longitude: 72.97,
          }
        }
      }
    });

    assert(Boolean(auditFarmer && auditBuyer1 && auditBuyer2), 'Seed test users created successfully.');

    // -------------------------------------------------------------------------
    // 2. SETUP AUDIT PRODUCE LOTS
    // -------------------------------------------------------------------------
    console.log('\n2. Creating produce lot for Phase 4 negotiation audit...');
    
    const auditLot = await lotRepository.createLot({
      farmerId: auditFarmer.id,
      cropName: 'Onion',
      variety: 'Lasalgaon Red',
      quantityAvailable: 100, // 100 Quintals
      unit: 'quintal',
      expectedHarvestDate: '2026-10-15',
      alreadyHarvested: false,
      grade: 'A',
      askPricePerUnit: 2000, // ₹2000 / quintal ask price
      publicVillage: 'Pimplegaon',
      publicTaluka: 'Niphad',
      publicDistrict: 'Nashik',
      latitude: 20.08,
      longitude: 74.01,
      farmAddress: 'Pimplegaon Baswant, Niphad, Nashik',
    });

    assert(auditLot.quantityAvailable === 100, 'Audit Produce Lot created (100 Quintals @ ₹2000).');

    // -------------------------------------------------------------------------
    // 3. TEST SELF-OFFER GUARD
    // -------------------------------------------------------------------------
    console.log('\n3. Testing Self-Offer Guard (Farmer bidding on own lot)...');
    try {
      await biddingRepository.createBid({
        lotId: auditLot.id,
        bidderId: auditFarmer.id, // Farmer himself!
        bidderRole: 'FARMER',
        offeredPricePerUnit: 1900,
        quantity: 10,
        paymentTermsDays: 0,
      });
      assert(false, 'Self-Offer Guard', 'Farmer was able to make an offer on his own lot!');
    } catch (err: any) {
      assert(
        err.message.includes('FORBIDDEN_SELF_OFFER'),
        'Self-Offer Guard',
        `Correctly blocked with message: "${err.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // 4. TEST MULTI-HOP COUNTER-OFFER LINEAGE
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Multi-Hop Counter-Offer Lineage (Offer A -> Counter B -> Counter C -> Counter D -> Accept E)...');
    
    // Hop 1: Buyer 1 creates root Offer A (60 Quintals @ ₹1800)
    const offerA = await biddingRepository.createBid({
      lotId: auditLot.id,
      bidderId: auditBuyer1.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 1800,
      quantity: 60,
      paymentTermsDays: 7,
    });
    assert(offerA.status === 'PENDING' && offerA.counterOfferId === null, 'Offer A created by Buyer 1 (60 Quintals @ ₹1800).');

    // Hop 2: Farmer counters with Counter B (₹1950)
    const counterBRes = await biddingRepository.respondToBid({
      bidId: offerA.id,
      userId: auditFarmer.id,
      action: 'COUNTER',
      counterPricePerUnit: 1950,
      counterQuantity: 60,
      counterPaymentTermsDays: 0,
    });
    const counterB = counterBRes.counterBid!;
    assert(counterB.status === 'PENDING' && counterB.counterOfferId === offerA.id, 'Counter B submitted by Farmer (60 Quintals @ ₹1950, linked to Offer A).');

    // Verify Offer A was transitioned to COUNTERED
    const reFetchedOfferA = await biddingRepository.findByLotId(auditLot.id);
    const updatedOfferA = reFetchedOfferA.find(o => o.id === offerA.id);
    assert(updatedOfferA?.status === 'COUNTERED', 'Offer A status transitioned to COUNTERED.');

    // Hop 3: Buyer 1 counters with Counter C (₹1900)
    const counterCRes = await biddingRepository.respondToBid({
      bidId: counterB.id,
      userId: auditBuyer1.id,
      action: 'COUNTER',
      counterPricePerUnit: 1900,
      counterQuantity: 60,
      counterPaymentTermsDays: 0,
    });
    const counterC = counterCRes.counterBid!;
    assert(counterC.status === 'PENDING' && counterC.counterOfferId === counterB.id, 'Counter C submitted by Buyer 1 (60 Quintals @ ₹1900, linked to Counter B).');

    // Hop 4: Farmer counters with Counter D (₹1925)
    const counterDRes = await biddingRepository.respondToBid({
      bidId: counterC.id,
      userId: auditFarmer.id,
      action: 'COUNTER',
      counterPricePerUnit: 1925,
      counterQuantity: 60,
      counterPaymentTermsDays: 0,
    });
    const counterD = counterDRes.counterBid!;
    assert(counterD.status === 'PENDING' && counterD.counterOfferId === counterC.id, 'Counter D submitted by Farmer (60 Quintals @ ₹1925, linked to Counter C).');

    // Hop 5: Buyer 1 accepts Counter D! (Farmer proposed Counter D, so Buyer 1 accepts it)
    const acceptedERes = await biddingRepository.respondToBid({
      bidId: counterD.id,
      userId: auditBuyer1.id, // Buyer 1 accepts Farmer's counter-offer
      action: 'ACCEPT',
    });
    const acceptedE = acceptedERes.bid!;
    assert(acceptedE.status === 'ACCEPTED', 'Counter D accepted! State = ACCEPTED.');

    // Trace complete negotiation timeline
    const timeline = await biddingRepository.getNegotiationTimeline(counterD.id);
    assert(
      timeline.length === 4,
      'Negotiation Timeline',
      `Reconstructed timeline contains ${timeline.length} events from root Offer A to Counter D.`
    );

    // Verify lot committed quantity after 60 Quintals accepted
    const lotAfter60 = await lotRepository.findLotById(auditLot.id);
    assert(
      lotAfter60?.status === 'UNDER_OFFER',
      'Lot Status after Offer 1 Acceptance',
      `Lot status is now ${lotAfter60?.status}.`
    );

    // -------------------------------------------------------------------------
    // 5. TEST ATOMIC CONCURRENCY & OVERSELLING GUARD
    // -------------------------------------------------------------------------
    console.log('\n5. Testing Concurrency & Overselling Guard...');
    // Currently 60 Quintals committed out of 100 Quintals. 40 Quintals available.
    
    // Buyer 2 creates Offer for 50 Quintals (Exceeds remaining 40 Quintals!)
    const offerBuyer2 = await biddingRepository.createBid({
      lotId: auditLot.id,
      bidderId: auditBuyer2.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 2050,
      quantity: 50,
      paymentTermsDays: 0,
    });

    try {
      // Farmer attempts to accept Offer for 50 Quintals
      await biddingRepository.respondToBid({
        bidId: offerBuyer2.id,
        userId: auditFarmer.id,
        action: 'ACCEPT',
      });
      assert(false, 'Overselling Guard', 'Farmer was able to accept offer exceeding available quantity!');
    } catch (err: any) {
      assert(
        err.message.includes('OFFER_CONFLICT') || err.message.includes('Insufficient'),
        'Overselling Guard',
        `Atomic transaction blocked overbooking with message: "${err.message}"`
      );
    }

    // Buyer 2 submits valid Offer for remaining 40 Quintals
    const offerBuyer2Valid = await biddingRepository.createBid({
      lotId: auditLot.id,
      bidderId: auditBuyer2.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 2000,
      quantity: 40,
      paymentTermsDays: 0,
    });

    // Farmer accepts 40 Quintals offer
    const accepted40Res = await biddingRepository.respondToBid({
      bidId: offerBuyer2Valid.id,
      userId: auditFarmer.id,
      action: 'ACCEPT',
    });
    assert(accepted40Res.bid!.status === 'ACCEPTED', 'Accepted offer for remaining 40 Quintals.');

    // Verify lot status transitions to SOLD / BOOKING_THRESHOLD_REACHED because 100/100 Quintals committed
    const lotFullyCommitted = await lotRepository.findLotById(auditLot.id);
    assert(
      lotFullyCommitted?.status === 'BOOKING_THRESHOLD_REACHED' || lotFullyCommitted?.status === 'SOLD',
      'Lot Full Commitment Transition',
      `Lot status transitioned to: ${lotFullyCommitted?.status}`
    );

    // -------------------------------------------------------------------------
    // 6. TEST BUYER OFFER WITHDRAWAL
    // -------------------------------------------------------------------------
    console.log('\n6. Testing Buyer Offer Withdrawal...');

    // Create a new fresh lot for withdrawal testing
    const auditLot2 = await lotRepository.createLot({
      farmerId: auditFarmer.id,
      cropName: 'Tomato',
      variety: 'Syngenta 6242',
      quantityAvailable: 50,
      unit: 'quintal',
      expectedHarvestDate: '2026-10-20',
      alreadyHarvested: false,
      grade: 'A',
      askPricePerUnit: 1500,
      publicVillage: 'Pimplegaon',
      publicTaluka: 'Niphad',
      publicDistrict: 'Nashik',
      latitude: 20.08,
      longitude: 74.01,
      farmAddress: 'Niphad, Nashik',
    });

    const pendingOfferToWithdraw = await biddingRepository.createBid({
      lotId: auditLot2.id,
      bidderId: auditBuyer1.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 1400,
      quantity: 20,
      paymentTermsDays: 0,
    });

    const withdrawnOffer = await biddingRepository.withdrawOffer({
      bidId: pendingOfferToWithdraw.id,
      userId: auditBuyer1.id,
    });
    assert(withdrawnOffer.status === 'WITHDRAWN', 'Buyer successfully withdrew PENDING offer.');

    // Try to withdraw an accepted offer owned by buyer2 (Must fail with INVALID_STATE_TRANSITION!)
    try {
      await biddingRepository.withdrawOffer({
        bidId: accepted40Res.bid!.id,
        userId: auditBuyer2.id, // Buyer 2 owns accepted40Res offer
      });
      assert(false, 'Accepted Offer Withdrawal Guard', 'Buyer was able to withdraw an ACCEPTED offer!');
    } catch (err: any) {
      assert(
        err.message.includes('INVALID_STATE_TRANSITION') || err.message.includes('Only pending'),
        'Accepted Offer Withdrawal Guard',
        `Correctly blocked: "${err.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // 7. TEST CLOSED LOT GUARD
    // -------------------------------------------------------------------------
    console.log('\n7. Testing Closed Lot Guard...');
    
    // Set auditLot2 to CANCELLED
    await lotRepository.transitionStatus(auditLot2.id, auditFarmer.id, 'CANCELLED');

    try {
      await biddingRepository.createBid({
        lotId: auditLot2.id,
        bidderId: auditBuyer1.id,
        bidderRole: 'BUYER',
        offeredPricePerUnit: 1400,
        quantity: 10,
        paymentTermsDays: 0,
      });
      assert(false, 'Closed Lot Guard', 'Buyer placed offer on CANCELLED lot!');
    } catch (err: any) {
      assert(
        err.message.includes('LOT_UNAVAILABLE'),
        'Closed Lot Guard',
        `Correctly blocked: "${err.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // 8. TEST PARTICIPANT AUTHORIZATION GUARD
    // -------------------------------------------------------------------------
    console.log('\n8. Testing Participant Authorization Guard...');
    
    const freshLotForAuth = await lotRepository.createLot({
      farmerId: auditFarmer.id,
      cropName: 'Potato',
      variety: 'Kufri Jyoti',
      quantityAvailable: 30,
      unit: 'quintal',
      expectedHarvestDate: '2026-10-25',
      alreadyHarvested: false,
      grade: 'A',
      askPricePerUnit: 1200,
      publicVillage: 'Pimplegaon',
      publicTaluka: 'Niphad',
      publicDistrict: 'Nashik',
      latitude: 20.08,
      longitude: 74.01,
      farmAddress: 'Niphad, Nashik',
    });

    const pendingOfferForAuth = await biddingRepository.createBid({
      lotId: freshLotForAuth.id,
      bidderId: auditBuyer1.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 1150,
      quantity: 15,
      paymentTermsDays: 0,
    });

    try {
      await biddingRepository.respondToBid({
        bidId: pendingOfferForAuth.id,
        userId: auditUnauthorizedUser.id, // Stranger!
        action: 'ACCEPT',
      });
      assert(false, 'Participant Authorization Guard', 'Unauthorized stranger responded to offer!');
    } catch (err: any) {
      assert(
        err.message.includes('UNAUTHORIZED_PARTICIPANT'),
        'Participant Authorization Guard',
        `Correctly blocked: "${err.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`AUDIT COMPLETE: ${testPassedCount} PASSED, ${testFailedCount} FAILED.`);
    console.log('===============================================================');

    if (testFailedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('CRITICAL AUDIT FAILURE:', error);
    process.exit(1);
  }
}

runPhase4Audit();
