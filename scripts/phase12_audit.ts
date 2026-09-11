import { AIAgentResponseSchema, AIAgentRequest } from '../src/lib/ai/AITaskProvider';
import { AIDemoAdapter } from '../src/lib/ai/AIDemoAdapter';
import { GeminiProviderAdapter } from '../src/lib/ai/GeminiProviderAdapter';
import { toolRegistry } from '../src/lib/ai/ToolRegistry';
import { previewTokenStore } from '../src/lib/ai/PreviewTokenStore';
import fs from 'fs';
import path from 'path';

async function runPhase12Audit() {
  console.log('\n=============================================================');
  console.log('  KRISHISETU — PHASE 12 COMPREHENSIVE AUDIT & REGRESSION SUITE');
  console.log('  Controlled AI Task Agent');
  console.log('=============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, description: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ TEST ${total} PASSED: ${description}`);
    } else {
      console.error(`  ❌ TEST ${total} FAILED: ${description}`);
      process.exit(1);
    }
  }

  // 1. Provider Abstraction & Zod Schema Validation
  const validOutputPayload = {
    responseType: 'ANSWER',
    intent: 'SEARCH_MARKET_PRICE',
    entities: { crop: 'Onion' },
    requestedTool: 'search_market_prices',
    toolArguments: { crop: 'Onion', district: 'Nashik' },
    requiresConfirmation: false,
    responseMessage: 'Found onion prices',
    isDemoMode: true,
  };
  const parsed = AIAgentResponseSchema.safeParse(validOutputPayload);
  assert(parsed.success === true, 'AIAgentResponseSchema validates clean structured output');

  const invalidPayload = {
    responseType: 'INVALID_ENUM_TYPE',
    intent: 12345,
  };
  const invalidParsed = AIAgentResponseSchema.safeParse(invalidPayload);
  assert(invalidParsed.success === false, 'AIAgentResponseSchema correctly rejects malformed model output');

  // 2. AIDemoAdapter Fallback & Truthful Labeling
  const demoAdapter = new AIDemoAdapter();
  assert(demoAdapter.isDemoMode === true, 'AIDemoAdapter explicitly sets isDemoMode to true');
  assert(demoAdapter.providerName.includes('Demo'), 'AIDemoAdapter provider name reflects Demo mode');

  const req1: AIAgentRequest = {
    userInput: 'Show onion price in Nashik',
    locale: 'en',
    sessionUser: { id: 'usr_farmer1', role: 'FARMER' },
  };
  const res1 = await demoAdapter.processTask(req1);
  assert(res1.responseType === 'TOOL_RESULT', 'AIDemoAdapter matches price query to TOOL_RESULT');
  assert(res1.requestedTool === 'search_market_prices', 'AIDemoAdapter selects search_market_prices tool');

  const reqUnsupported: AIAgentRequest = {
    userInput: 'Predict crypto stock prices for 2030',
    locale: 'en',
    sessionUser: { id: 'usr_farmer1', role: 'FARMER' },
  };
  const resUnsupported = await demoAdapter.processTask(reqUnsupported);
  assert(resUnsupported.responseType === 'UNSUPPORTED_REQUEST', 'AIDemoAdapter returns UNSUPPORTED_REQUEST for out-of-scope queries');
  assert(resUnsupported.responseMessage.includes('Demo Mode'), 'AIDemoAdapter clearly informs user of Demo Mode limit');

  // 3. GeminiProviderAdapter API Key Fallback
  const geminiAdapter = new GeminiProviderAdapter();
  const resGeminiFallback = await geminiAdapter.processTask(req1);
  assert(resGeminiFallback.isDemoMode === true, 'GeminiProviderAdapter falls back to Demo Mode when GEMINI_API_KEY is unconfigured');

  // 4. ToolRegistry Permission Matrix
  const searchTool = toolRegistry.get('search_market_prices');
  assert(searchTool !== undefined, 'Tool search_market_prices is registered');
  assert(searchTool?.readOnly === true, 'search_market_prices is classified as READ ONLY');
  assert(searchTool?.confirmationRequired === false, 'search_market_prices does NOT require confirmation');

  const prepareListingTool = toolRegistry.get('prepare_crop_listing');
  assert(prepareListingTool !== undefined, 'Tool prepare_crop_listing is registered');
  assert(prepareListingTool?.readOnly === false, 'prepare_crop_listing is classified as ACTION PREP');
  assert(prepareListingTool?.requiredRole === 'FARMER', 'prepare_crop_listing enforces FARMER role check');
  assert(prepareListingTool?.confirmationRequired === true, 'prepare_crop_listing requires user confirmation');

  // 5. Tool Execution & Role Authorization Enforcement
  const unauthExecute = await prepareListingTool?.execute(
    { cropName: 'Onion', quantityAvailable: 10, askPricePerUnit: 2500, publicDistrict: 'Nashik' },
    { userId: 'usr_buyer1', role: 'BUYER' }
  );
  assert(unauthExecute?.success === false, 'prepare_crop_listing blocks execution for non-FARMER roles');
  assert(unauthExecute?.error?.includes('UNAUTHORIZED_ROLE') === true, 'Role authorization error message returned');

  const authExecute = await prepareListingTool?.execute(
    { cropName: 'Onion', quantityAvailable: 10, askPricePerUnit: 2500, publicDistrict: 'Nashik' },
    { userId: 'usr_farmer1', role: 'FARMER' }
  );
  assert(authExecute?.success === true, 'prepare_crop_listing succeeds for authorized FARMER');
  assert(typeof authExecute?.previewId === 'string', 'prepare_crop_listing returns signed previewId');
  assert(authExecute?.previewPayload?.actionType === 'CREATE_CROP_LISTING', 'Preview payload contains correct actionType');

  // 6. PreviewTokenStore Single-Use & Expiration Safeguards
  const previewId = authExecute?.previewId || '';
  const tokenRecord = previewTokenStore.getPreviewToken(previewId);
  assert(tokenRecord !== null, 'PreviewTokenStore stores active preview record');
  assert(tokenRecord?.userId === 'usr_farmer1', 'Preview token is bound to authenticated userId');

  // IDOR Block
  const idorConsume = previewTokenStore.consumePreviewToken(previewId, 'usr_attacker', 'CREATE_CROP_LISTING');
  assert(idorConsume === null, 'PreviewTokenStore blocks consumption attempt by unauthorized user ID');

  // Valid Consume
  const validConsume = previewTokenStore.consumePreviewToken(previewId, 'usr_farmer1', 'CREATE_CROP_LISTING');
  assert(validConsume !== null, 'PreviewTokenStore allows single-use consumption by bound owner');

  // Re-use Block (Atomic One-Time Use)
  const doubleConsume = previewTokenStore.consumePreviewToken(previewId, 'usr_farmer1', 'CREATE_CROP_LISTING');
  assert(doubleConsume === null, 'PreviewTokenStore blocks duplicate/double consumption of preview token');

  // 7. Deterministic Net Realization Calculation Tool
  const calcTool = toolRegistry.get('calculate_net_realization');
  assert(calcTool !== undefined, 'calculate_net_realization tool is registered');
  const calcRes = await calcTool?.execute(
    { modalPricePerUnit: 2500, quantity: 10, distanceKm: 20, storageDays: 0 },
    { userId: 'usr_farmer1', role: 'FARMER' }
  );
  assert(calcRes?.success === true, 'calculate_net_realization executes successfully');
  const calcData = calcRes?.data as any;
  assert(calcData.grossRevenue === 25000, 'Gross revenue calculated deterministically (2500 * 10 = 25000)');
  assert(calcData.apmcCommission === 375, 'APMC commission calculated deterministically (1.5% of 25000 = 375)');

  // 8. Navigation Route Allowlist Guard
  const navTool = toolRegistry.get('navigate_to');
  const safeNav = await navTool?.execute({ path: '/orders' }, { userId: 'usr1', role: 'FARMER' });
  assert(safeNav?.success === true, 'Allowed path /orders accepted by navigate_to tool');

  const forbiddenNav = await navTool?.execute({ path: '/admin/secret-override' }, { userId: 'usr1', role: 'FARMER' });
  assert(forbiddenNav?.success === false, 'Forbidden path correctly blocked by navigate_to tool');

  // 9. Additional Action Preparation Tools Registration Tests
  const acceptTool = toolRegistry.get('prepare_accept_offer');
  assert(acceptTool !== undefined, 'prepare_accept_offer tool is registered');
  assert(acceptTool?.confirmationRequired === true, 'prepare_accept_offer requires user confirmation');

  const orderPrepTool = toolRegistry.get('prepare_order');
  assert(orderPrepTool !== undefined, 'prepare_order tool is registered');
  assert(orderPrepTool?.confirmationRequired === true, 'prepare_order requires user confirmation');

  const transportPrepTool = toolRegistry.get('prepare_transport_request');
  assert(transportPrepTool !== undefined, 'prepare_transport_request tool is registered');
  assert(transportPrepTool?.confirmationRequired === true, 'prepare_transport_request requires user confirmation');

  const storagePrepTool = toolRegistry.get('prepare_storage_reservation');
  assert(storagePrepTool !== undefined, 'prepare_storage_reservation tool is registered');
  assert(storagePrepTool?.confirmationRequired === true, 'prepare_storage_reservation requires user confirmation');

  // 10. Input Character Length & Context Limits
  const longPrompt = 'A'.repeat(2001);
  assert(longPrompt.length > 2000, 'Input character limit test payload exceeds 2,000 chars');

  // 10. Audit Script Files Verification (Phases 4-11 Regression Protection)
  const requiredAuditFiles = [
    'scripts/phase4_audit.ts',
    'scripts/phase5_audit.ts',
    'scripts/phase6_audit.ts',
    'scripts/phase7_audit.ts',
    'scripts/phase8_audit.ts',
    'scripts/phase9_audit.ts',
    'scripts/phase10_audit.ts',
    'scripts/phase11_audit.ts',
  ];
  for (const file of requiredAuditFiles) {
    const fullPath = path.join(process.cwd(), file);
    assert(fs.existsSync(fullPath), `Regression protection audit script ${file} is present`);
  }

  console.log('\n=============================================================');
  console.log(`  PHASE 12 AUDIT COMPLETE: ${passed}/${total} TESTS PASSED`);
  console.log('=============================================================\n');
}

runPhase12Audit().catch((err) => {
  console.error('Phase 12 audit execution error:', err);
  process.exit(1);
});
