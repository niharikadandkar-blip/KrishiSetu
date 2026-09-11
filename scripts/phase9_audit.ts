import { notificationRepository } from '../src/lib/repositories/notificationRepository';
import { notificationService } from '../src/lib/services/notificationService';
import { db } from '../src/lib/db';
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

async function runPhase9Audit() {
  console.log('\n=============================================================');
  console.log('  KRISHISETU — PHASE 9 COMPREHENSIVE AUDIT & REGRESSION SUITE');
  console.log('  Notifications, Alerts & Action Reminders');
  console.log('=============================================================\n');

  try {
    const testUserId1 = 'phase9_user_farmer_1';
    const testUserId2 = 'phase9_user_buyer_2';
    const strangerUserId = 'phase9_user_stranger_3';

    // Clean baseline & seed users
    await db.notification.deleteMany({ where: { userId: { in: [testUserId1, testUserId2, strangerUserId] } } });
    await db.notificationPreference.deleteMany({ where: { userId: { in: [testUserId1, testUserId2, strangerUserId] } } });
    await db.marketAlertConfig.deleteMany({ where: { userId: { in: [testUserId1, testUserId2, strangerUserId] } } });

    await db.user.upsert({
      where: { id: testUserId1 },
      update: {},
      create: { id: testUserId1, mobile: '9900112233', name: 'Phase9 Farmer User', role: 'FARMER' },
    });
    await db.user.upsert({
      where: { id: testUserId2 },
      update: {},
      create: { id: testUserId2, mobile: '9900112234', name: 'Phase9 Buyer User', role: 'BUYER' },
    });
    await db.user.upsert({
      where: { id: strangerUserId },
      update: {},
      create: { id: strangerUserId, mobile: '9900112235', name: 'Phase9 Stranger User', role: 'BUYER' },
    });

    // -------------------------------------------------------------
    // TEST 1: Notification Model & Data Contract
    // -------------------------------------------------------------
    const notif1 = await notificationRepository.createNotification({
      userId: testUserId1,
      type: 'OFFER_RECEIVED',
      category: 'OFFER',
      priority: 'NORMAL',
      titleKey: 'notifications.offerReceivedTitle',
      messageKey: 'notifications.offerReceivedMsg',
      payload: { cropName: 'Onion', quantity: 50, pricePerUnit: 2400 },
      deepLink: '/offers',
      sourceEntityType: 'OFFER',
      sourceEntityId: 'off_audit_101',
      idempotencyKey: 'idemp_aud_101',
    });

    assert(
      Boolean(notif1 && notif1.id && notif1.category === 'OFFER' && notif1.readAt === null),
      'Notification Model Creation & Data Contract Compliance',
      `ID: ${notif1?.id}, Category: ${notif1?.category}`
    );

    // -------------------------------------------------------------
    // TEST 2: Recipient Isolation & Correct Delivery
    // -------------------------------------------------------------
    const feedUser1 = await notificationRepository.getUserNotifications(testUserId1);
    const feedUser2 = await notificationRepository.getUserNotifications(testUserId2);

    assert(
      feedUser1.notifications.length === 1 && feedUser2.notifications.length === 0,
      'Recipient Isolation (Notification delivered only to recipient user)',
      `User 1 Count: ${feedUser1.notifications.length}, User 2 Count: ${feedUser2.notifications.length}`
    );

    // -------------------------------------------------------------
    // TEST 3: IDOR Protection on Mark As Read
    // -------------------------------------------------------------
    let idorBlocked = false;
    try {
      await notificationRepository.markAsRead(notif1!.id, strangerUserId);
    } catch (err: any) {
      if (err.message.includes('UNAUTHORIZED_IDOR')) {
        idorBlocked = true;
      }
    }
    assert(idorBlocked, 'IDOR Protection (Prevent marking another user notification as read)');

    // -------------------------------------------------------------
    // TEST 4: Mark Notification As Read (Authorized)
    // -------------------------------------------------------------
    const readNotif = await notificationRepository.markAsRead(notif1!.id, testUserId1);
    assert(
      Boolean(readNotif && readNotif.readAt !== null),
      'Authorized Mark As Read State Transition',
      `readAt: ${readNotif?.readAt}`
    );

    // -------------------------------------------------------------
    // TEST 5: Unread Count Accuracy
    // -------------------------------------------------------------
    await notificationRepository.createNotification({
      userId: testUserId1,
      type: 'ORDER_CREATED',
      category: 'ORDER',
      priority: 'HIGH',
      titleKey: 'notifications.orderCreatedTitle',
      messageKey: 'notifications.orderCreatedMsg',
      payload: { orderNumber: 'KS-ORD-9001' },
      deepLink: '/orders/KS-ORD-9001',
    });

    const unreadCount = await notificationRepository.getUnreadCount(testUserId1);
    assert(unreadCount === 1, 'Unread Count Calculation Accuracy', `Unread count: ${unreadCount}`);

    // -------------------------------------------------------------
    // TEST 6: Mark All As Read
    // -------------------------------------------------------------
    const updatedCount = await notificationRepository.markAllAsRead(testUserId1);
    const postMarkAllUnread = await notificationRepository.getUnreadCount(testUserId1);
    assert(
      updatedCount >= 1 && postMarkAllUnread === 0,
      'Mark All As Read Execution & Zero Unread Count Verification',
      `Updated: ${updatedCount}, Post Unread: ${postMarkAllUnread}`
    );

    // -------------------------------------------------------------
    // TEST 7: Idempotency & Duplicate Prevention
    // -------------------------------------------------------------
    const dupeKey = 'idemp_dupe_test_777';
    const notifA = await notificationRepository.createNotification({
      userId: testUserId1,
      type: 'TRANSPORT_ACCEPTED',
      category: 'TRANSPORT',
      titleKey: 'notifications.transportAcceptedTitle',
      messageKey: 'notifications.transportAcceptedMsg',
      idempotencyKey: dupeKey,
    });

    const notifB = await notificationRepository.createNotification({
      userId: testUserId1,
      type: 'TRANSPORT_ACCEPTED',
      category: 'TRANSPORT',
      titleKey: 'notifications.transportAcceptedTitle',
      messageKey: 'notifications.transportAcceptedMsg',
      idempotencyKey: dupeKey,
    });

    assert(
      notifA?.id === notifB?.id,
      'Idempotency Key Duplicate Prevention',
      `Notif A ID: ${notifA?.id}, Notif B ID: ${notifB?.id}`
    );

    // -------------------------------------------------------------
    // TEST 8: Deep Link Validity Format
    // -------------------------------------------------------------
    assert(
      Boolean(notifA?.deepLink === undefined || (notif1?.deepLink && notif1.deepLink.startsWith('/'))),
      'Deep Link Format Validity (Relative app path starting with /)',
      `Deep Link: '${notif1?.deepLink}'`
    );

    // -------------------------------------------------------------
    // TEST 9: Offer Event Notification Generator
    // -------------------------------------------------------------
    const offerNotif = await notificationService.notifyOfferEvent({
      eventType: 'OFFER_RECEIVED',
      recipientUserId: testUserId1,
      senderUserId: testUserId2,
      offerId: 'off_999',
      lotId: 'lot_999',
      cropName: 'Tomato',
      quantity: 100,
      pricePerUnit: 1800,
    });

    assert(
      Boolean(offerNotif && offerNotif.category === 'OFFER' && offerNotif.deepLink === '/offers'),
      'Offer Domain Event Notification Generation',
      `Type: ${offerNotif?.type}, Deep Link: ${offerNotif?.deepLink}`
    );

    // -------------------------------------------------------------
    // TEST 10: Order Event Notification Generator (Required Flag)
    // -------------------------------------------------------------
    const orderNotif = await notificationService.notifyOrderEvent({
      eventType: 'ORDER_CREATED',
      recipientUserId: testUserId1,
      orderId: 'ord_999',
      orderNumber: 'KS-ORD-999',
      cropName: 'Tomato',
      quantity: 100,
      status: 'ORDER_CREATED',
    });

    assert(
      Boolean(orderNotif && orderNotif.category === 'ORDER' && orderNotif.isRequired === true),
      'Order Domain Event Notification Generation & Required Workflow Flag',
      `Required: ${orderNotif?.isRequired}`
    );

    // -------------------------------------------------------------
    // TEST 11: Transport Event Notification Generator
    // -------------------------------------------------------------
    const transportNotif = await notificationService.notifyTransportEvent({
      eventType: 'TRANSPORT_ACCEPTED',
      recipientUserId: testUserId1,
      requestId: 'tr_req_999',
      vehicleType: 'Mini Truck',
      status: 'ACCEPTED',
    });

    assert(
      Boolean(transportNotif && transportNotif.category === 'TRANSPORT'),
      'Transport Domain Event Notification Generation',
      `Category: ${transportNotif?.category}`
    );

    // -------------------------------------------------------------
    // TEST 12: Storage Event Notification Generator
    // -------------------------------------------------------------
    const storageNotif = await notificationService.notifyStorageEvent({
      eventType: 'STORAGE_ACCEPTED',
      recipientUserId: testUserId1,
      requestId: 'st_req_999',
      facilityName: 'Nashik Cold Storage',
      cropName: 'Onion',
      status: 'ACCEPTED',
    });

    assert(
      Boolean(storageNotif && storageNotif.category === 'STORAGE'),
      'Storage Domain Event Notification Generation',
      `Category: ${storageNotif?.category}`
    );

    // -------------------------------------------------------------
    // TEST 13: Data-Condition Market Alert Evaluation (ABOVE Threshold)
    // -------------------------------------------------------------
    await notificationRepository.createMarketAlertConfig(testUserId1, 'Potato', 'Pune', 2000, 'ABOVE');
    await notificationService.evaluateMarketAlerts('Potato', 'Pune', 2200, true);

    const mktFeeds = await notificationRepository.getUserNotifications(testUserId1, { category: 'MARKET' });
    assert(
      mktFeeds.notifications.length > 0 && mktFeeds.notifications[0].payload?.isDemoData === true,
      'Market Price Threshold Data Alert Evaluation & Demo Data Attribution',
      `Count: ${mktFeeds.notifications.length}, Source: ${mktFeeds.notifications[0]?.payload?.source}`
    );

    // -------------------------------------------------------------
    // TEST 14: Data-Condition Weather Advisory Alert Evaluation
    // -------------------------------------------------------------
    await notificationService.evaluateWeatherAlerts(testUserId1, 'Nashik', 'Rainy', 15, 85, true);

    const wxFeeds = await notificationRepository.getUserNotifications(testUserId1, { category: 'WEATHER' });
    assert(
      wxFeeds.notifications.length > 0 && wxFeeds.notifications[0].payload?.condition === 'Rainy',
      'Weather Advisory Data Alert Evaluation & Cautionary Advisory Framing',
      `Condition: ${wxFeeds.notifications[0]?.payload?.condition}`
    );

    // -------------------------------------------------------------
    // TEST 15: Notification Preferences (Optional Category Suppression)
    // -------------------------------------------------------------
    await notificationRepository.updatePreferences(testUserId2, { enableOffers: false });
    const suppressedOffer = await notificationRepository.createNotification({
      userId: testUserId2,
      type: 'OFFER_RECEIVED',
      category: 'OFFER',
      titleKey: 'notifications.offerReceivedTitle',
      messageKey: 'notifications.offerReceivedMsg',
      isRequired: false,
    });

    assert(
      suppressedOffer === null,
      'Notification Preferences Optional Category Suppression (Offers disabled)',
      `Returned notification: ${suppressedOffer}`
    );

    // -------------------------------------------------------------
    // TEST 16: Required Workflow Bypass of Optional Preferences
    // -------------------------------------------------------------
    const bypassOrder = await notificationRepository.createNotification({
      userId: testUserId2,
      type: 'ORDER_CREATED',
      category: 'ORDER',
      titleKey: 'notifications.orderCreatedTitle',
      messageKey: 'notifications.orderCreatedMsg',
      isRequired: true, // Bypass optional toggles
    });

    assert(
      bypassOrder !== null,
      'Required Transactional Workflow Preference Bypass Enforcement',
      `Bypass Notification ID: ${bypassOrder?.id}`
    );

    // -------------------------------------------------------------
    // TEST 17: IDOR Protection on Market Alert Config Deletion
    // -------------------------------------------------------------
    const alertCfg = await notificationRepository.createMarketAlertConfig(testUserId1, 'Onion', 'Nashik', 3000, 'ABOVE');
    let alertIdorBlocked = false;
    try {
      await notificationRepository.deleteMarketAlertConfig(alertCfg.id, strangerUserId);
    } catch (err: any) {
      if (err.message.includes('UNAUTHORIZED_IDOR')) {
        alertIdorBlocked = true;
      }
    }
    assert(alertIdorBlocked, 'IDOR Protection on Market Alert Config Deletion');

    // -------------------------------------------------------------
    // TEST 18: Dormant External Notification Providers Interface Validation
    // -------------------------------------------------------------
    const pushRes = await notificationService.pushProvider.sendPush(testUserId1, 'Title', 'Body');
    assert(
      pushRes.success === false && pushRes.providerName.includes('Dormant'),
      'Dormant Push Provider Interface Safety (No fake push notifications claimed)',
      `Provider: '${pushRes.providerName}'`
    );

    // -------------------------------------------------------------
    // TEST 19: Trilingual i18n Completeness for Notifications
    // -------------------------------------------------------------
    const enJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/en.json'), 'utf8'));
    const hiJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/hi.json'), 'utf8'));
    const mrJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/mr.json'), 'utf8'));

    const enKeys = Object.keys(enJson.notifications || {});
    const hiKeys = Object.keys(hiJson.notifications || {});
    const mrKeys = Object.keys(mrJson.notifications || {});

    assert(
      enKeys.length >= 20 && hiKeys.length === enKeys.length && mrKeys.length === enKeys.length,
      'Trilingual i18n Notification Dictionary Completeness (EN / HI / MR)',
      `Keys count: EN=${enKeys.length}, HI=${hiKeys.length}, MR=${mrKeys.length}`
    );

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n=============================================================');
    console.log(`  PHASE 9 AUDIT RESULTS: ${passedTests} / ${totalTests} PASSED`);
    console.log('=============================================================\n');

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal audit failure:', err);
    process.exit(1);
  }
}

runPhase9Audit();
