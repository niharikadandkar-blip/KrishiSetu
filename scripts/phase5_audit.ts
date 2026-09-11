import { db } from '../src/lib/db';
import { biddingRepository } from '../src/lib/repositories/biddingRepository';
import { lotRepository } from '../src/lib/repositories/lotRepository';
import { orderRepository } from '../src/lib/repositories/orderRepository';

async function runPhase5Audit() {
  console.log('===============================================================');
  console.log('KRISHISETU — PHASE 5 VERIFICATION AUDIT & INTEGRATION TEST');
  console.log('Orders, Deal Confirmation & End-to-End Transaction Workflow');
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
    console.log('1. Setting up test users (Farmer, Buyer 1, Stranger)...');

    const existingUsers = await db.user.findMany({
      where: { mobile: { in: ['9876500001', '9123500002', '9998800003'] } },
      select: { id: true },
    });
    const userIds = existingUsers.map((u) => u.id);

    if (userIds.length > 0) {
      await db.orderTimelineEvent.deleteMany({
        where: { order: { OR: [{ farmerId: { in: userIds } }, { buyerId: { in: userIds } }] } },
      });
      await db.order.deleteMany({
        where: { OR: [{ farmerId: { in: userIds } }, { buyerId: { in: userIds } }] },
      });
      await db.offerAndBid.deleteMany({
        where: { OR: [{ bidderId: { in: userIds } }, { lot: { farmerId: { in: userIds } } }] },
      });
      await db.harvestPrebooking.deleteMany({
        where: { OR: [{ buyerId: { in: userIds } }, { lot: { farmerId: { in: userIds } } }] },
      });
      await db.lot.deleteMany({
        where: { farmerId: { in: userIds } },
      });
      await db.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    const farmer = await db.user.create({
      data: {
        name: 'Ganesh Shinde (Phase 5 Farmer)',
        mobile: '9876500001',
        role: 'FARMER',
        language: 'mr',
        mobileVerified: true,
        profileVerified: true,
        location: {
          create: {
            state: 'Maharashtra',
            district: 'Nashik',
            taluka: 'Chandwad',
            village: 'Sogras',
            latitude: 20.32,
            longitude: 74.24,
          },
        },
      },
    });

    const buyer = await db.user.create({
      data: {
        name: 'Vikram Mehta (Phase 5 Buyer)',
        mobile: '9123500002',
        role: 'BUYER',
        language: 'en',
        mobileVerified: true,
        profileVerified: true,
        location: {
          create: {
            state: 'Maharashtra',
            district: 'Mumbai',
            taluka: 'Vashi APMC',
            village: 'Vashi',
            latitude: 19.07,
            longitude: 72.99,
          },
        },
      },
    });

    const stranger = await db.user.create({
      data: {
        name: 'Unauthorized Intruder',
        mobile: '9998800003',
        role: 'BUYER',
        language: 'hi',
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
          },
        },
      },
    });

    assert(Boolean(farmer && buyer && stranger), 'Audit users created successfully.');

    // -------------------------------------------------------------------------
    // 2. CREATE PRODUCE LOT & OFFER ACCEPTANCE
    // -------------------------------------------------------------------------
    console.log('\n2. Creating produce lot and executing offer acceptance...');

    const lot = await lotRepository.createLot({
      farmerId: farmer.id,
      cropName: 'Pomegranate',
      variety: 'Bhagwa Super',
      quantityAvailable: 80, // 80 Quintals
      unit: 'quintal',
      expectedHarvestDate: '2026-11-01',
      alreadyHarvested: false,
      grade: 'A',
      askPricePerUnit: 6000, // ₹6000 / quintal
      publicVillage: 'Sogras',
      publicTaluka: 'Chandwad',
      publicDistrict: 'Nashik',
      latitude: 20.32,
      longitude: 74.24,
      farmAddress: 'Sogras Farm, Chandwad, Nashik',
    });

    // Create valid offer from buyer (50 Quintals @ ₹5800)
    const offer = await biddingRepository.createBid({
      lotId: lot.id,
      bidderId: buyer.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 5800,
      quantity: 50,
      paymentTermsDays: 0,
    });

    // Farmer accepts offer
    const acceptRes = await biddingRepository.respondToBid({
      bidId: offer.id,
      userId: farmer.id,
      action: 'ACCEPT',
    });

    const acceptedOffer = acceptRes.bid!;
    assert(acceptedOffer.status === 'ACCEPTED', 'Offer accepted by farmer (50 Quintals @ ₹5800).');

    // -------------------------------------------------------------------------
    // 3. TEST ORDER CREATION FROM ACCEPTED OFFER
    // -------------------------------------------------------------------------
    console.log('\n3. Testing Order Creation from Accepted Offer...');

    const order = await orderRepository.createOrderFromAcceptedOffer({
      acceptedOfferId: acceptedOffer.id,
      userId: buyer.id,
      idempotencyKey: 'idempotent-key-p5-001',
    });

    assert(
      order.status === 'ORDER_CREATED' && order.agreedTotalValue === 50 * 5800,
      'Order generated successfully',
      `Order #${order.orderNumber} created with agreed value ₹${order.agreedTotalValue}.`
    );

    // -------------------------------------------------------------------------
    // 4. TEST IDEMPOTENCY & DUPLICATE ORDER GUARD
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Order Creation Idempotency (Duplicate Request Guard)...');

    const duplicateOrder = await orderRepository.createOrderFromAcceptedOffer({
      acceptedOfferId: acceptedOffer.id,
      userId: buyer.id,
      idempotencyKey: 'idempotent-key-p5-001',
    });

    assert(
      duplicateOrder.id === order.id,
      'Idempotency Guard',
      'Second order creation attempt returned existing order without creating duplicate.'
    );

    // -------------------------------------------------------------------------
    // 5. TEST REJECT UNACCEPTED OFFER ORDER CREATION
    // -------------------------------------------------------------------------
    console.log('\n5. Testing Unaccepted Offer Order Creation Guard...');

    const pendingOffer = await biddingRepository.createBid({
      lotId: lot.id,
      bidderId: buyer.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 5500,
      quantity: 10,
      paymentTermsDays: 7,
    });

    try {
      await orderRepository.createOrderFromAcceptedOffer({
        acceptedOfferId: pendingOffer.id,
        userId: buyer.id,
      });
      assert(false, 'Unaccepted Offer Guard', 'Order was generated from a PENDING offer!');
    } catch (err: any) {
      assert(
        err.message.includes('INVALID_OFFER_STATUS'),
        'Unaccepted Offer Guard',
        `Correctly blocked: "${err.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // 6. TEST IDOR & PARTICIPANT AUTHORIZATION GUARD
    // -------------------------------------------------------------------------
    console.log('\n6. Testing IDOR & Participant Access Guard...');

    try {
      await orderRepository.findOrderById(order.id, stranger.id);
      assert(false, 'IDOR Access Guard', 'Stranger viewed private order details!');
    } catch (err: any) {
      assert(
        err.message.includes('UNAUTHORIZED_PARTICIPANT'),
        'IDOR Access Guard',
        `Correctly blocked stranger access: "${err.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // 7. TEST STATE MACHINE LIFECYCLE TRANSITIONS
    // -------------------------------------------------------------------------
    console.log('\n7. Testing Server-Authoritative State Machine Transitions...');

    // Hop 1: CONFIRMED
    const confirmedOrder = await orderRepository.transitionOrderStatus({
      orderId: order.id,
      userId: farmer.id,
      targetStatus: 'CONFIRMED',
    });
    assert(confirmedOrder.status === 'CONFIRMED', 'Order transitioned to CONFIRMED.');

    // Hop 2: PICKUP_PLANNED
    const plannedOrder = await orderRepository.transitionOrderStatus({
      orderId: order.id,
      userId: buyer.id,
      targetStatus: 'PICKUP_PLANNED',
      pickupPlannedDate: '2026-11-02',
      pickupAddress: 'Sogras Farmgate Gate 1',
    });
    assert(plannedOrder.status === 'PICKUP_PLANNED', 'Order transitioned to PICKUP_PLANNED.');

    // Test Role Restriction: Buyer trying to mark READY_FOR_PICKUP (Must fail!)
    try {
      await orderRepository.transitionOrderStatus({
        orderId: order.id,
        userId: buyer.id, // Buyer!
        targetStatus: 'READY_FOR_PICKUP',
      });
      assert(false, 'Farmer-Only State Guard', 'Buyer marked order READY_FOR_PICKUP!');
    } catch (err: any) {
      assert(
        err.message.includes('UNAUTHORIZED_ACTION'),
        'Farmer-Only State Guard',
        `Correctly blocked buyer: "${err.message}"`
      );
    }

    // Hop 3: READY_FOR_PICKUP (Farmer)
    const readyOrder = await orderRepository.transitionOrderStatus({
      orderId: order.id,
      userId: farmer.id, // Farmer!
      targetStatus: 'READY_FOR_PICKUP',
    });
    assert(readyOrder.status === 'READY_FOR_PICKUP', 'Farmer marked order READY_FOR_PICKUP.');

    // Hop 4: PICKED_UP
    const pickedUpOrder = await orderRepository.transitionOrderStatus({
      orderId: order.id,
      userId: buyer.id,
      targetStatus: 'PICKED_UP',
    });
    assert(pickedUpOrder.status === 'PICKED_UP', 'Order transitioned to PICKED_UP.');

    // Hop 5: IN_TRANSIT
    const transitOrder = await orderRepository.transitionOrderStatus({
      orderId: order.id,
      userId: farmer.id,
      targetStatus: 'IN_TRANSIT',
    });
    assert(transitOrder.status === 'IN_TRANSIT', 'Order transitioned to IN_TRANSIT.');

    // Hop 6: DELIVERED
    const deliveredOrder = await orderRepository.transitionOrderStatus({
      orderId: order.id,
      userId: buyer.id,
      targetStatus: 'DELIVERED',
    });
    assert(deliveredOrder.status === 'DELIVERED', 'Order transitioned to DELIVERED.');

    // Hop 7: RECEIPT_PENDING (Buyer initiates inspection)
    const pendingReceiptOrder = await orderRepository.transitionOrderStatus({
      orderId: order.id,
      userId: buyer.id,
      targetStatus: 'RECEIPT_PENDING',
    });
    assert(pendingReceiptOrder.status === 'RECEIPT_PENDING', 'Order transitioned to RECEIPT_PENDING.');

    // Hop 8: COMPLETED (Buyer confirms receipt)
    const completedOrder = await orderRepository.transitionOrderStatus({
      orderId: order.id,
      userId: buyer.id,
      targetStatus: 'COMPLETED',
    });
    assert(completedOrder.status === 'COMPLETED', 'Order transitioned to COMPLETED.');

    // Verify Invalid Transition on Terminal State (COMPLETED -> PICKED_UP must fail!)
    try {
      await orderRepository.transitionOrderStatus({
        orderId: order.id,
        userId: farmer.id,
        targetStatus: 'PICKED_UP',
      });
      assert(false, 'Terminal State Transition Guard', 'Modified a COMPLETED order!');
    } catch (err: any) {
      assert(
        err.message.includes('INVALID_STATE_TRANSITION'),
        'Terminal State Transition Guard',
        `Correctly blocked modification of COMPLETED order: "${err.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // 8. TEST CANCELLATION & COMMITMENT RELEASE
    // -------------------------------------------------------------------------
    console.log('\n8. Testing Order Cancellation & Commitment Inventory Release...');

    // Create fresh offer + order for cancellation test
    const offer2 = await biddingRepository.createBid({
      lotId: lot.id,
      bidderId: buyer.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 6000,
      quantity: 20,
      paymentTermsDays: 0,
    });

    const acceptRes2 = await biddingRepository.respondToBid({
      bidId: offer2.id,
      userId: farmer.id,
      action: 'ACCEPT',
    });

    const orderToCancel = await orderRepository.createOrderFromAcceptedOffer({
      acceptedOfferId: acceptRes2.bid!.id,
      userId: buyer.id,
    });

    // Cancel Order
    const cancelledOrder = await orderRepository.cancelOrder({
      orderId: orderToCancel.id,
      userId: buyer.id,
      cancellationReason: 'Rain disruption at farmgate.',
    });

    assert(cancelledOrder.status === 'CANCELLED', 'Order status set to CANCELLED.');

    // Verify underlying offer preserves ACCEPTED status for truthful negotiation history
    const reFetchedOffer2 = await biddingRepository.findByLotId(lot.id);
    const updatedOffer2 = reFetchedOffer2.find((o) => o.id === offer2.id);
    assert(
      updatedOffer2?.status === 'ACCEPTED',
      'Historical Offer Truth Preserved',
      'Underlying offer status remains ACCEPTED so historical negotiation lineage remains truthful.'
    );

    // Verify repeated cancellation attempt fails
    try {
      await orderRepository.cancelOrder({
        orderId: orderToCancel.id,
        userId: buyer.id,
        cancellationReason: 'Duplicate cancellation attempt',
      });
      assert(false, 'Repeat Cancellation Guard', 'Failed to block duplicate cancellation on already CANCELLED order.');
    } catch (err: any) {
      assert(
        err.message.startsWith('INVALID_STATE_TRANSITION'),
        'Repeat Cancellation Guard',
        `Correctly blocked repeat cancellation: "${err.message}"`
      );
    }

    // Verify Unauthenticated IDOR access fails
    try {
      await orderRepository.findOrderById(order.id, undefined);
      assert(false, 'Unauthenticated IDOR Guard', 'Failed to block unauthenticated order lookup.');
    } catch (err: any) {
      assert(
        err.message.startsWith('UNAUTHORIZED_PARTICIPANT'),
        'Unauthenticated IDOR Guard',
        `Correctly blocked unauthenticated lookup: "${err.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // 9. VERIFY TIMELINE EVENT PERSISTENCE
    // -------------------------------------------------------------------------
    console.log('\n9. Verifying Real Persisted Timeline History...');

    const detailedCompletedOrder = await orderRepository.findOrderById(order.id, farmer.id);
    assert(
      Boolean(detailedCompletedOrder?.timelineEvents && detailedCompletedOrder.timelineEvents.length === 9),
      'Timeline Event History',
      `Completed order contains ${detailedCompletedOrder?.timelineEvents?.length} real persisted timeline events.`
    );

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

runPhase5Audit();
