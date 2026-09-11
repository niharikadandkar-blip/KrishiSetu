import { db } from '../src/lib/db';
import { providerRepository } from '../src/lib/repositories/providerRepository';
import { transportRepository } from '../src/lib/repositories/transportRepository';
import { storageRepository, normalizeCapacityQuantity } from '../src/lib/repositories/storageRepository';
import { orderRepository } from '../src/lib/repositories/orderRepository';
import { biddingRepository } from '../src/lib/repositories/biddingRepository';

async function runPhase6Audit() {
  console.log('===============================================================');
  console.log('KRISHISETU — PHASE 6 VERIFICATION AUDIT & INTEGRATION TEST');
  console.log('Transportation + Storage Fulfillment Platform');
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
    console.log('1. Setting up test users & clean audit baseline...');

    const existingUsers = await db.user.findMany({
      where: { mobile: { in: ['9876600001', '9123600002', '9998860003', '9554460004'] } },
      select: { id: true },
    });
    const userIds = existingUsers.map((u) => u.id);

    if (userIds.length > 0) {
      await db.transportTimelineEvent.deleteMany({
        where: { request: { OR: [{ requesterId: { in: userIds } }] } },
      });
      await db.transportRequest.deleteMany({
        where: { OR: [{ requesterId: { in: userIds } }] },
      });
      await db.storageTimelineEvent.deleteMany({
        where: { request: { OR: [{ requesterId: { in: userIds } }] } },
      });
      await db.storageRequest.deleteMany({
        where: { OR: [{ requesterId: { in: userIds } }] },
      });
      await db.transportVehicle.deleteMany({
        where: { provider: { userId: { in: userIds } } },
      });
      await db.storageFacility.deleteMany({
        where: { provider: { userId: { in: userIds } } },
      });
      await db.providerProfile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await db.orderTimelineEvent.deleteMany({
        where: { order: { OR: [{ farmerId: { in: userIds } }, { buyerId: { in: userIds } }] } },
      });
      await db.order.deleteMany({
        where: { OR: [{ farmerId: { in: userIds } }, { buyerId: { in: userIds } }] },
      });
      await db.offerAndBid.deleteMany({
        where: { OR: [{ bidderId: { in: userIds } }, { lot: { farmerId: { in: userIds } } }] },
      });
      await db.lot.deleteMany({ where: { farmerId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }

    const farmer = await db.user.create({
      data: {
        name: 'Phase 6 Farmer',
        mobile: '9876600001',
        role: 'FARMER',
        language: 'mr',
        mobileVerified: true,
        profileVerified: true,
      },
    });

    const buyer = await db.user.create({
      data: {
        name: 'Phase 6 Buyer',
        mobile: '9123600002',
        role: 'BUYER',
        language: 'en',
        mobileVerified: true,
        profileVerified: true,
      },
    });

    const providerUser = await db.user.create({
      data: {
        name: 'Phase 6 Multi-Provider',
        mobile: '9998860003',
        role: 'ADMIN',
        language: 'en',
        mobileVerified: true,
        profileVerified: true,
      },
    });

    const strangerUser = await db.user.create({
      data: {
        name: 'Phase 6 Stranger',
        mobile: '9554460004',
        role: 'BUYER',
        language: 'hi',
        mobileVerified: true,
      },
    });

    assert(Boolean(farmer && buyer && providerUser), 'Audit Users Created Successfully');

    // -------------------------------------------------------------------------
    // 2. TEST PROVIDER REGISTRATION & MULTI-CAPABILITY
    // -------------------------------------------------------------------------
    console.log('\n2. Testing Provider Registration & Multi-Capability (Transport + Storage)...');

    const provider = await providerRepository.registerProvider({
      userId: providerUser.id,
      businessName: 'KrishiSetu Integrated Logistics & Cold Chain',
      hasTransportServices: true,
      hasStorageServices: true,
      contactName: 'Suresh Patil',
      contactMobile: '9998860003',
      state: 'Maharashtra',
      district: 'Nashik',
      taluka: 'Chandwad',
      village: 'Sogras',
    });

    assert(
      Boolean(provider.hasTransportServices && provider.hasStorageServices),
      'Multi-Capability Provider Registration',
      'Single provider successfully registered offering both Transportation and Storage capabilities.'
    );

    const vehicle = await providerRepository.addVehicle({
      providerId: provider.id,
      userId: providerUser.id,
      vehicleType: 'MINI_TRUCK',
      vehicleNumber: 'MH 15 AB 9999',
      capacity: 50, // 50 Quintals
      capacityUnit: 'Quintal',
      supportedCrops: 'Onion, Potato, Tomato',
      serviceAreaDistricts: 'Nashik, Pune, Thane',
      pricingMethod: 'PER_KM',
      ratePerKm: 25,
    });

    const facility = await providerRepository.addFacility({
      providerId: provider.id,
      userId: providerUser.id,
      facilityName: 'Sogras Cold Storage & Godown',
      facilityType: 'COLD_STORAGE',
      totalCapacity: 10, // 10 Tonnes canonical facility capacity
      capacityUnit: 'Tonne',
      supportedCrops: 'Potato, Onion, Fruit',
      pricePerUnitPerDay: 150,
      state: 'Maharashtra',
      district: 'Nashik',
      taluka: 'Chandwad',
      village: 'Sogras',
    });

    assert(Boolean(vehicle && facility), 'Fleet & Facility Created', `Vehicle (${vehicle.vehicleNumber}) & Storage Facility (${facility.facilityName}) initialized.`);

    // -------------------------------------------------------------------------
    // 3. TEST CANONICAL UNIT NORMALIZATION & MISMATCH
    // -------------------------------------------------------------------------
    console.log('\n3. Testing Storage Unit Normalization & Mismatch Guard...');

    const norm1 = normalizeCapacityQuantity(50, 'Quintal', 'Tonne');
    assert(norm1 === 5, 'Unit Normalization (50 Quintals = 5 Tonnes)', `50 Quintals correctly converted to ${norm1} Tonnes.`);

    try {
      normalizeCapacityQuantity(100, 'Gallons', 'Tonne');
      assert(false, 'Unit Mismatch Guard', 'Failed to throw on unsupported capacity unit.');
    } catch (err: any) {
      assert(err.message.startsWith('UNIT_MISMATCH'), 'Unit Mismatch Guard', `Correctly rejected unsupported unit: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // 4. TEST GENUINE CONCURRENT CAPACITY RESERVATION & OVERBOOKING
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Genuine Concurrent Storage Capacity Reservation & Overbooking Lock...');

    // Facility capacity = 10 Tonnes.
    // Create 2 requests (6 Tonnes each).
    const req1 = await storageRepository.createStorageRequest({
      userId: farmer.id,
      facilityId: facility.id,
      cropName: 'Potato',
      quantity: 6,
      unit: 'Tonne',
      expectedCheckInDate: '2026-09-20',
      durationDays: 10,
    });

    const req2 = await storageRepository.createStorageRequest({
      userId: buyer.id,
      facilityId: facility.id,
      cropName: 'Onion',
      quantity: 6,
      unit: 'Tonne',
      expectedCheckInDate: '2026-09-21',
      durationDays: 7,
    });

    // Execute concurrent acceptance transition: 6 Tonnes + 6 Tonnes > 10 Tonnes total capacity. Exactly 1 must succeed and 1 must fail with CAPACITY_OVERBOOKED!
    const transitionResults = await Promise.allSettled([
      storageRepository.transitionStorageStatus({ requestId: req1.id, userId: providerUser.id, targetStatus: 'ACCEPTED' }),
      storageRepository.transitionStorageStatus({ requestId: req2.id, userId: providerUser.id, targetStatus: 'ACCEPTED' }),
    ]);

    const fulfilledCount = transitionResults.filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = transitionResults.filter((r) => r.status === 'rejected').length;

    assert(fulfilledCount === 1 && rejectedCount === 1, 'Concurrent Overbooking Protection', `Exactly 1 request succeeded and 1 was rejected out of 2 competing requests.`);

    const rejectedResult = transitionResults.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    assert(
      Boolean(rejectedResult?.reason?.message?.startsWith('CAPACITY_OVERBOOKED')),
      'Overbooking Rejection Code',
      `Overbooking rejection error: "${rejectedResult?.reason?.message}"`
    );

    const checkCap = await storageRepository.checkFacilityCapacity(facility.id, 1, 'Tonne');
    assert(checkCap.availableCapacity === 4, 'Remaining Available Capacity Check', `Available capacity is exactly ${checkCap.availableCapacity} Tonnes (never negative).`);

    // -------------------------------------------------------------------------
    // 5. TEST TRANSPORT ARRANGEMENTS & DRIVER DISTINCTION
    // -------------------------------------------------------------------------
    console.log('\n5. Testing Transport Arrangement Types & Driver Contact Assignment...');

    const transportReq = await transportRepository.createTransportRequest({
      userId: farmer.id,
      arrangementType: 'KRISHISETU_PROVIDER',
      providerId: provider.id,
      vehicleId: vehicle.id,
      cropCategory: 'Onion',
      quantity: 40,
      unit: 'Quintal',
      pickupVillage: 'Sogras',
      pickupTaluka: 'Chandwad',
      pickupDistrict: 'Nashik',
      deliveryVillage: 'Vashi',
      deliveryTaluka: 'Navi Mumbai',
      deliveryDistrict: 'Thane',
      scheduledPickupDate: '2026-09-18',
    });

    assert(transportReq.status === 'REQUESTED', 'Transport Request Created in REQUESTED Status');

    // Transition to ACCEPTED and assign driver details
    const acceptedTransport = await transportRepository.transitionTransportStatus({
      requestId: transportReq.id,
      userId: providerUser.id,
      targetStatus: 'ACCEPTED',
      driverName: 'Vikram Shinde',
      driverMobile: '9888877777',
      notes: 'Vehicle and driver assigned for pickup.',
    });

    assert(
      acceptedTransport.status === 'ACCEPTED' && acceptedTransport.driverName === 'Vikram Shinde',
      'Provider Acceptance & Driver Assignment',
      `Driver '${acceptedTransport.driverName}' (${acceptedTransport.driverMobile}) assigned to transport job.`
    );

    // -------------------------------------------------------------------------
    // 6. TEST ONE ACTIVE TRANSPORT ASSIGNMENT PER ORDER INVARIANT
    // -------------------------------------------------------------------------
    console.log('\n6. Testing One Active Transport Assignment per Order Invariant...');

    // Create Phase 5 Order
    const lot = await db.lot.create({
      data: {
        farmerId: farmer.id,
        cropName: 'Phase 6 Wheat',
        quantityAvailable: 100,
        unit: 'Quintal',
        askPricePerUnit: 2200,
        expectedHarvestDate: new Date(),
        alreadyHarvested: true,
        publicVillage: 'Sogras',
        publicTaluka: 'Chandwad',
        publicDistrict: 'Nashik',
        status: 'PUBLISHED',
      },
    });

    const offer = await biddingRepository.createBid({
      lotId: lot.id,
      bidderId: buyer.id,
      bidderRole: 'BUYER',
      offeredPricePerUnit: 2200,
      quantity: 50,
    });

    await biddingRepository.respondToBid({
      bidId: offer.id,
      userId: farmer.id,
      action: 'ACCEPT',
    });

    const order = await orderRepository.createOrderFromAcceptedOffer({
      acceptedOfferId: offer.id,
      userId: buyer.id,
    });

    // Create 1st Transport Request for Order
    const orderTransport1 = await transportRepository.createTransportRequest({
      userId: buyer.id,
      orderId: order.id,
      arrangementType: 'BUYER_ARRANGED',
      cropCategory: 'Wheat',
      quantity: 50,
      scheduledPickupDate: '2026-09-22',
      pickupVillage: 'Sogras',
      pickupTaluka: 'Chandwad',
      pickupDistrict: 'Nashik',
      deliveryVillage: 'Vashi',
      deliveryTaluka: 'Navi Mumbai',
      deliveryDistrict: 'Thane',
    });

    assert(orderTransport1.orderId === order.id, 'First Transport Assignment Linked to Order');

    // Attempting 2nd active transport request for same Order must fail!
    try {
      await transportRepository.createTransportRequest({
        userId: farmer.id,
        orderId: order.id,
        arrangementType: 'FARMER_ARRANGED',
        cropCategory: 'Wheat',
        quantity: 50,
        scheduledPickupDate: '2026-09-23',
        pickupVillage: 'Sogras',
        pickupTaluka: 'Chandwad',
        pickupDistrict: 'Nashik',
        deliveryVillage: 'Vashi',
        deliveryTaluka: 'Navi Mumbai',
        deliveryDistrict: 'Thane',
      });
      assert(false, 'One Active Transport Invariant Guard', 'Failed to block competing active transport assignment on same Order.');
    } catch (err: any) {
      assert(
        err.message.startsWith('ACTIVE_TRANSPORT_EXISTS'),
        'One Active Transport Invariant Guard',
        `Correctly blocked competing active transport: "${err.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // 7. TEST 3-TIER PRIVACY MASKING
    // -------------------------------------------------------------------------
    console.log('\n7. Testing 3-Tier Privacy Masking (Public vs Fulfillment)...');

    const publicTransportView = await transportRepository.findTransportById(orderTransport1.id, strangerUser.id);
    assert(
      publicTransportView?.driverName === null && publicTransportView?.pickupAddress === null,
      'Stranger Transport Privacy Masking',
      'Unrelated user receives null for protected street address and driver contact.'
    );

    const participantTransportView = await transportRepository.findTransportById(acceptedTransport.id, farmer.id);
    assert(
      participantTransportView?.driverName === 'Vikram Shinde',
      'Participant Transport Detail Unmasking',
      'Authorized participant receives driver details.'
    );

    // -------------------------------------------------------------------------
    // 8. TEST SPLIT STORAGE & CAPACITY RELEASE ON CANCELLATION
    // -------------------------------------------------------------------------
    console.log('\n8. Testing Split Storage & Capacity Release on Cancellation...');

    // Successful Storage Request (6 Tonnes) is currently active.
    // Cancel it to verify capacity release.
    const activeStorageReq = (transitionResults.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>).value;

    const cancelledStorage = await storageRepository.cancelStorageRequest({
      requestId: activeStorageReq.id,
      userId: farmer.id,
      cancellationReason: 'Harvest delayed.',
    });

    assert(cancelledStorage.status === 'CANCELLED', 'Storage Reservation Cancelled');

    const checkCapAfterCancel = await storageRepository.checkFacilityCapacity(facility.id, 1, 'Tonne');
    assert(
      checkCapAfterCancel.availableCapacity === 10,
      'Capacity Released Exactly Once',
      `Facility available capacity restored to ${checkCapAfterCancel.availableCapacity} Tonnes after cancellation.`
    );

    // -------------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`AUDIT COMPLETE: ${testPassedCount} PASSED, ${testFailedCount} FAILED.`);
    console.log('===============================================================');

    if (testFailedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('CRITICAL AUDIT FAILURE:', error);
    process.exit(1);
  }
}

runPhase6Audit();
