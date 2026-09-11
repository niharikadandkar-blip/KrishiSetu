import { db } from '../src/lib/db';
import { reputationService } from '../src/lib/services/reputationService';
import { reportService } from '../src/lib/services/reportService';
import { reviewRepository } from '../src/lib/repositories/reviewRepository';
import { reportRepository } from '../src/lib/repositories/reportRepository';
import { createReviewSchema, createReportSchema } from '../src/lib/validations/phase10';
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

async function runPhase10Audit() {
  console.log('\n=============================================================');
  console.log('  KRISHISETU — PHASE 10 COMPREHENSIVE AUDIT & REGRESSION SUITE');
  console.log('  Trust, Reputation & Safety Layer');
  console.log('=============================================================\n');

  try {
    const farmerId = 'phase10_farmer_user';
    const buyerId = 'phase10_buyer_user';
    const strangerId = 'phase10_stranger_user';
    const adminId = 'phase10_admin_user';

    // Clean test data
    await db.transactionReview.deleteMany({ where: { OR: [{ reviewerId: { in: [farmerId, buyerId, strangerId] } }, { reviewedUserId: { in: [farmerId, buyerId, strangerId] } }] } });
    await db.moderationNote.deleteMany({ where: { report: { reporterId: { in: [farmerId, buyerId, strangerId] } } } });
    await db.report.deleteMany({ where: { reporterId: { in: [farmerId, buyerId, strangerId] } } });
    await db.notification.deleteMany({ where: { userId: { in: [farmerId, buyerId, strangerId, adminId] } } });
    await db.orderTimelineEvent.deleteMany({ where: { order: { farmerId } } });
    await db.order.deleteMany({ where: { farmerId } });
    await db.offerAndBid.deleteMany({ where: { lot: { farmerId } } });
    await db.lot.deleteMany({ where: { farmerId } });
    await db.verificationRequest.deleteMany({ where: { userId: { in: [farmerId, buyerId, strangerId, adminId] } } });

    // Seed test users
    await db.user.upsert({
      where: { id: farmerId },
      update: { mobileVerified: true, profileVerified: true },
      create: { id: farmerId, mobile: '9988776655', name: 'Phase10 Farmer Ramesh', role: 'FARMER', mobileVerified: true, profileVerified: true },
    });

    await db.user.upsert({
      where: { id: buyerId },
      update: { mobileVerified: true, profileVerified: false },
      create: { id: buyerId, mobile: '9988776656', name: 'Phase10 Buyer Suresh', role: 'BUYER', mobileVerified: true, profileVerified: false },
    });

    await db.user.upsert({
      where: { id: strangerId },
      update: {},
      create: { id: strangerId, mobile: '9988776657', name: 'Phase10 Stranger Mahesh', role: 'BUYER', mobileVerified: false, profileVerified: false },
    });

    await db.user.upsert({
      where: { id: adminId },
      update: {},
      create: { id: adminId, mobile: '9988776658', name: 'Phase10 Admin Officer', role: 'ADMIN', mobileVerified: true, profileVerified: true },
    });

    // Seed DigiLocker verification request for farmer
    await db.verificationRequest.create({
      data: {
        userId: farmerId,
        verificationType: 'DIGILOCKER_AADHAAR',
        status: 'APPROVED',
        provider: 'DIGILOCKER_PROD',
      },
    });

    // Seed Lot
    const lot = await db.lot.create({
      data: {
        farmerId,
        cropName: 'Nashik Red Onion',
        quantityAvailable: 100,
        unit: 'Quintal',
        askPricePerUnit: 2500,
        expectedHarvestDate: new Date(),
        publicVillage: 'Pimplgaon',
        publicTaluka: 'Niphad',
        publicDistrict: 'Nashik',
        status: 'PUBLISHED',
      },
    });

    // Seed Offer
    const offer = await db.offerAndBid.create({
      data: {
        lotId: lot.id,
        bidderId: buyerId,
        bidderRole: 'BUYER',
        offeredPricePerUnit: 2500,
        quantity: 50,
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    // Seed Completed Order
    const completedOrder = await db.order.create({
      data: {
        orderNumber: `ORD-P10-COMP-${Date.now()}`,
        acceptedOfferId: offer.id,
        lotId: lot.id,
        farmerId,
        buyerId,
        cropName: 'Nashik Red Onion',
        quantity: 50,
        unit: 'Quintal',
        agreedPricePerUnit: 2500,
        agreedTotalValue: 125000,
        farmerName: 'Phase10 Farmer Ramesh',
        farmerMobile: '9988776655',
        buyerName: 'Phase10 Buyer Suresh',
        buyerMobile: '9988776656',
        publicVillage: 'Pimplgaon',
        publicTaluka: 'Niphad',
        publicDistrict: 'Nashik',
        status: 'COMPLETED',
      },
    });

    // Seed Pending Order (ORDER_CREATED)
    const offerPending = await db.offerAndBid.create({
      data: {
        lotId: lot.id,
        bidderId: buyerId,
        bidderRole: 'BUYER',
        offeredPricePerUnit: 2400,
        quantity: 20,
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const pendingOrder = await db.order.create({
      data: {
        orderNumber: `ORD-P10-PEND-${Date.now()}`,
        acceptedOfferId: offerPending.id,
        lotId: lot.id,
        farmerId,
        buyerId,
        cropName: 'Nashik Red Onion',
        quantity: 20,
        unit: 'Quintal',
        agreedPricePerUnit: 2400,
        agreedTotalValue: 48000,
        farmerName: 'Phase10 Farmer Ramesh',
        farmerMobile: '9988776655',
        buyerName: 'Phase10 Buyer Suresh',
        buyerMobile: '9988776656',
        publicVillage: 'Pimplgaon',
        publicTaluka: 'Niphad',
        publicDistrict: 'Nashik',
        status: 'ORDER_CREATED',
      },
    });

    // -------------------------------------------------------------
    // TEST 1: Initial Reputation Summary for Unreviewed User
    // -------------------------------------------------------------
    const initialSummary = await reputationService.getUserReputationSummary(buyerId);
    assert(
      initialSummary.completedTransactionCount === 1 &&
        initialSummary.totalReviewCount === 0 &&
        initialSummary.averageRating === 0,
      'Initial reputation summary returns correct transaction count and 0 ratings'
    );

    // -------------------------------------------------------------
    // TEST 2: Verification Badges for Mobile Verified
    // -------------------------------------------------------------
    assert(
      initialSummary.verificationBadges.includes('✓ Mobile Verified'),
      'Mobile verified user includes ✓ Mobile Verified badge'
    );

    // -------------------------------------------------------------
    // TEST 3: Verification Badges for Profile Verified
    // -------------------------------------------------------------
    const farmerSummary = await reputationService.getUserReputationSummary(farmerId);
    assert(
      farmerSummary.verificationBadges.includes('✓ Profile Verified'),
      'Profile verified user includes ✓ Profile Verified badge'
    );

    // -------------------------------------------------------------
    // TEST 4: Verification Badges for DigiLocker Verified
    // -------------------------------------------------------------
    assert(
      farmerSummary.verificationBadges.includes('✓ DigiLocker Verified'),
      'User with approved DigiLocker request includes ✓ DigiLocker Verified badge'
    );

    // -------------------------------------------------------------
    // TEST 5: Review Eligibility Gate — Block NON-COMPLETED Orders
    // -------------------------------------------------------------
    const nonCompletedCheck = await reputationService.checkReviewEligibility(farmerId, pendingOrder.id);
    assert(
      !nonCompletedCheck.eligible && Boolean(nonCompletedCheck.reason?.includes('completed')),
      'Review submission correctly blocked for non-completed order'
    );

    // -------------------------------------------------------------
    // TEST 6: Review Eligibility Gate — Block Non-Participant
    // -------------------------------------------------------------
    const nonParticipantCheck = await reputationService.checkReviewEligibility(strangerId, completedOrder.id);
    assert(
      !nonParticipantCheck.eligible && Boolean(nonParticipantCheck.reason?.includes('participants')),
      'Review submission correctly blocked for non-participant'
    );

    // -------------------------------------------------------------
    // TEST 7: Review Eligibility Gate — Block Self-Review
    // -------------------------------------------------------------
    const selfReviewCheck = await reputationService.checkReviewEligibility(farmerId, completedOrder.id, farmerId);
    assert(
      !selfReviewCheck.eligible && Boolean(selfReviewCheck.reason?.includes('yourself')),
      'Review submission correctly blocked for self-review'
    );

    // -------------------------------------------------------------
    // TEST 8: Review Eligibility Gate — Valid Completed Order Participant
    // -------------------------------------------------------------
    const validCheck = await reputationService.checkReviewEligibility(farmerId, completedOrder.id);
    assert(
      validCheck.eligible && validCheck.reviewedUserId === buyerId,
      'Valid order participant returns eligible with correct target user'
    );

    // -------------------------------------------------------------
    // TEST 9: Submit Valid Review (Farmer -> Buyer)
    // -------------------------------------------------------------
    const review1 = await reputationService.submitReview(farmerId, {
      orderId: completedOrder.id,
      rating: 5,
      comment: 'Prompt payment and excellent communication!',
    });
    assert(
      review1.rating === 5 && review1.reviewedUserId === buyerId,
      'Farmer submitted 5-star transaction review for buyer'
    );

    // -------------------------------------------------------------
    // TEST 10: Notification Sent to Reviewed User
    // -------------------------------------------------------------
    const buyerNotifs = await db.notification.findMany({ where: { userId: buyerId, type: 'REVIEW_RECEIVED' } });
    assert(
      buyerNotifs.length > 0,
      'Notification automatically created for buyer upon receiving transaction review'
    );

    // -------------------------------------------------------------
    // TEST 11: Enforce Unique Review Constraint (Duplicate blocked)
    // -------------------------------------------------------------
    let duplicateBlocked = false;
    try {
      await reputationService.submitReview(farmerId, {
        orderId: completedOrder.id,
        rating: 4,
        comment: 'Trying duplicate',
      });
    } catch (e: any) {
      duplicateBlocked = true;
    }
    assert(duplicateBlocked, 'Duplicate review submission for same order & user is blocked');

    // -------------------------------------------------------------
    // TEST 12: Submit Valid Review (Buyer -> Farmer)
    // -------------------------------------------------------------
    const review2 = await reputationService.submitReview(buyerId, {
      orderId: completedOrder.id,
      rating: 4,
      comment: 'Good quality onions, nicely packed.',
    });
    assert(
      review2.rating === 4 && review2.reviewedUserId === farmerId,
      'Buyer submitted 4-star transaction review for farmer'
    );

    // -------------------------------------------------------------
    // TEST 13: Fetch User Reviews
    // -------------------------------------------------------------
    const buyerReviews = await reputationService.getUserReviews(buyerId);
    assert(
      buyerReviews.total === 1 && buyerReviews.reviews[0].rating === 5,
      'getUserReviews returns correct transaction reviews for buyer'
    );

    // -------------------------------------------------------------
    // TEST 14: Reputation Summary Calculation for Buyer
    // -------------------------------------------------------------
    const buyerRepAfter = await reputationService.getUserReputationSummary(buyerId);
    assert(
      buyerRepAfter.averageRating === 5.0 && buyerRepAfter.totalReviewCount === 1,
      'Reputation summary calculates exact average rating 5.0 for buyer'
    );

    // -------------------------------------------------------------
    // TEST 15: Reputation Summary Calculation for Farmer
    // -------------------------------------------------------------
    const farmerRepAfter = await reputationService.getUserReputationSummary(farmerId);
    assert(
      farmerRepAfter.averageRating === 4.0 && farmerRepAfter.totalReviewCount === 1,
      'Reputation summary calculates exact average rating 4.0 for farmer'
    );

    // -------------------------------------------------------------
    // TEST 16: Update Review Content & Rating
    // -------------------------------------------------------------
    const updatedReview = await reputationService.updateReview(farmerId, review1.id, {
      rating: 5,
      comment: 'Updated: Outstanding buyer, prompt payment!',
    });
    assert(
      Boolean(updatedReview.comment?.includes('Outstanding buyer')),
      'Reviewer can update review comment'
    );

    // -------------------------------------------------------------
    // TEST 17: IDOR Check on Review Update (Stranger edit blocked)
    // -------------------------------------------------------------
    let idorReviewBlocked = false;
    try {
      await reputationService.updateReview(strangerId, review1.id, { comment: 'Hacked' });
    } catch (e: any) {
      idorReviewBlocked = e.message.includes('UNAUTHORIZED_IDOR');
    }
    assert(idorReviewBlocked, 'IDOR check blocks stranger from updating another user review');

    // -------------------------------------------------------------
    // TEST 18: Reject Rating < 1 in Validation Schema
    // -------------------------------------------------------------
    const lowRatingCheck = createReviewSchema.safeParse({ orderId: completedOrder.id, rating: 0 });
    assert(!lowRatingCheck.success, 'Validation schema rejects rating < 1');

    // -------------------------------------------------------------
    // TEST 19: Reject Rating > 5 in Validation Schema
    // -------------------------------------------------------------
    const highRatingCheck = createReviewSchema.safeParse({ orderId: completedOrder.id, rating: 6 });
    assert(!highRatingCheck.success, 'Validation schema rejects rating > 5');

    // -------------------------------------------------------------
    // TEST 20: Create Safety Report
    // -------------------------------------------------------------
    const report1 = await reportService.createReport(buyerId, {
      reportedUserId: farmerId,
      orderId: completedOrder.id,
      category: 'NON_PAYMENT',
      description: 'Dispute regarding moisture percentage discount calculation during pickup.',
    });
    assert(
      report1.status === 'OPEN' && report1.reporterId === buyerId,
      'Safety report created with OPEN status'
    );

    // -------------------------------------------------------------
    // TEST 21: Notification Sent to Reporter on Report Creation
    // -------------------------------------------------------------
    const reportNotifs = await db.notification.findMany({ where: { userId: buyerId, type: 'REPORT_SUBMITTED' } });
    assert(
      reportNotifs.length > 0,
      'Notification sent to reporter confirming submission of safety report'
    );

    // -------------------------------------------------------------
    // TEST 22: Reject Report with Description < 10 characters
    // -------------------------------------------------------------
    let shortDescBlocked = false;
    try {
      await reportService.createReport(buyerId, {
        category: 'FRAUD',
        description: 'Short',
      });
    } catch (e: any) {
      shortDescBlocked = true;
    }
    assert(shortDescBlocked, 'Safety report rejects descriptions under 10 characters');

    // -------------------------------------------------------------
    // TEST 23: Reject Invalid Category in Validation Schema
    // -------------------------------------------------------------
    const invalidCatCheck = createReportSchema.safeParse({
      category: 'INVALID_CATEGORY',
      description: 'Valid long description for testing category validation',
    });
    assert(!invalidCatCheck.success, 'Validation schema rejects invalid report category');

    // -------------------------------------------------------------
    // TEST 24: Fetch User Reports
    // -------------------------------------------------------------
    const userReports = await reportService.getUserReports(buyerId);
    assert(
      userReports.length === 1 && userReports[0].id === report1.id,
      'getUserReports returns filed safety reports for user'
    );

    // -------------------------------------------------------------
    // TEST 25: Fetch Single Report Details for Reporter
    // -------------------------------------------------------------
    const reportDetails = await reportService.getReportById(report1.id, buyerId, 'BUYER');
    assert(
      reportDetails.id === report1.id,
      'Reporter can view details of their filed safety report'
    );

    // -------------------------------------------------------------
    // TEST 26: IDOR Protection on Report Access
    // -------------------------------------------------------------
    let idorReportBlocked = false;
    try {
      await reportService.getReportById(report1.id, strangerId, 'BUYER');
    } catch (e: any) {
      idorReportBlocked = e.message.includes('UNAUTHORIZED_IDOR');
    }
    assert(idorReportBlocked, 'IDOR protection blocks stranger from viewing private report');

    // -------------------------------------------------------------
    // TEST 27: Admin Fetching Report Details Succeeds
    // -------------------------------------------------------------
    const adminReportDetails = await reportService.getReportById(report1.id, adminId, 'ADMIN');
    assert(
      adminReportDetails.id === report1.id,
      'Admin user can view details of any safety report'
    );

    // -------------------------------------------------------------
    // TEST 28: Non-Admin Blocked from Admin Reports Dashboard
    // -------------------------------------------------------------
    let nonAdminBlocked = false;
    try {
      await reportService.getAdminReports('FARMER');
    } catch (e: any) {
      nonAdminBlocked = e.message.includes('ADMIN');
    }
    assert(nonAdminBlocked, 'Non-admin user blocked from admin reports endpoint');

    // -------------------------------------------------------------
    // TEST 29: Admin Reports Query (All)
    // -------------------------------------------------------------
    const adminReports = await reportService.getAdminReports('ADMIN');
    assert(
      adminReports.total >= 1,
      'Admin can list all safety reports'
    );

    // -------------------------------------------------------------
    // TEST 30: Admin Filter Reports by Status
    // -------------------------------------------------------------
    const openReports = await reportService.getAdminReports('ADMIN', { status: 'OPEN' });
    assert(
      openReports.reports.every((r) => r.status === 'OPEN'),
      'Admin can filter safety reports by status (OPEN)'
    );

    // -------------------------------------------------------------
    // TEST 31: Admin Filter Reports by Category
    // -------------------------------------------------------------
    const nonPaymentReports = await reportService.getAdminReports('ADMIN', { category: 'NON_PAYMENT' });
    assert(
      nonPaymentReports.reports.every((r) => r.category === 'NON_PAYMENT'),
      'Admin can filter safety reports by category (NON_PAYMENT)'
    );

    // -------------------------------------------------------------
    // TEST 32: Admin Update Status to UNDER_REVIEW
    // -------------------------------------------------------------
    const updatedStatus1 = await reportService.updateReportStatus(adminId, 'ADMIN', report1.id, {
      status: 'UNDER_REVIEW',
      moderationNote: 'Reviewing order timeline and payment receipt records.',
    });
    assert(
      updatedStatus1.status === 'UNDER_REVIEW',
      'Admin updated report status to UNDER_REVIEW'
    );

    // -------------------------------------------------------------
    // TEST 33: Moderation Note Recorded and Associated
    // -------------------------------------------------------------
    assert(
      updatedStatus1.moderationNotes?.length === 1 &&
        updatedStatus1.moderationNotes[0].note.includes('Reviewing order timeline'),
      'Moderation note correctly created and associated with report'
    );

    // -------------------------------------------------------------
    // TEST 34: Admin Resolving Report Sets resolvedAt Timestamp
    // -------------------------------------------------------------
    const resolvedReport = await reportService.updateReportStatus(adminId, 'ADMIN', report1.id, {
      status: 'RESOLVED',
      moderationNote: 'Parties resolved payment discrepancy via mutual adjustment.',
    });
    assert(
      resolvedReport.status === 'RESOLVED' && resolvedReport.resolvedAt !== null,
      'Admin resolving report sets resolvedAt timestamp'
    );

    // -------------------------------------------------------------
    // TEST 35: Non-Admin Blocked from Updating Report Status
    // -------------------------------------------------------------
    let nonAdminUpdateBlocked = false;
    try {
      await reportService.updateReportStatus(farmerId, 'FARMER', report1.id, { status: 'DISMISSED' });
    } catch (e: any) {
      nonAdminUpdateBlocked = e.message.includes('ADMIN');
    }
    assert(nonAdminUpdateBlocked, 'Non-admin blocked from updating report status');

    // -------------------------------------------------------------
    // TEST 36: Trilingual Localization Files Completeness
    // -------------------------------------------------------------
    const enLoc = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/en.json'), 'utf-8'));
    const hiLoc = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/hi.json'), 'utf-8'));
    const mrLoc = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/mr.json'), 'utf-8'));

    const enHasTrust = !!enLoc.trust?.trustTitle && !!enLoc.reports?.adminTitle;
    const hiHasTrust = !!hiLoc.trust?.trustTitle && !!hiLoc.reports?.adminTitle;
    const mrHasTrust = !!mrLoc.trust?.trustTitle && !!mrLoc.reports?.adminTitle;

    assert(
      enHasTrust && hiHasTrust && mrHasTrust,
      'Trilingual locale files (en, hi, mr) contain trust & reports translation dictionaries'
    );

    // -------------------------------------------------------------
    // TEST 37: Zero AI Claims Verification
    // -------------------------------------------------------------
    const reputationServiceCode = fs.readFileSync(path.join(process.cwd(), 'src/lib/services/reputationService.ts'), 'utf-8');
    const hasAiTerms = /ai_score|aiTrust|openai|llm|neural/i.test(reputationServiceCode);
    assert(
      !hasAiTerms,
      'Truthful reputation signals verified: No AI or synthetic rating algorithms found'
    );

    console.log('\n=============================================================');
    console.log(`  PHASE 10 AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('=============================================================\n');

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Phase 10 audit:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

runPhase10Audit();
