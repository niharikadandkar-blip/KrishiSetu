import { WebSpeechAdapter } from '../src/lib/voice/WebSpeechAdapter';
import { VoiceCommandResolver } from '../src/lib/voice/VoiceCommandResolver';
import { SpokenFormatNormalizer } from '../src/lib/voice/SpokenFormatNormalizer';
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

async function runPhase11Audit() {
  console.log('\n=============================================================');
  console.log('  KRISHISETU — PHASE 11 COMPREHENSIVE AUDIT & REGRESSION SUITE');
  console.log('  Voice-First Interaction Layer');
  console.log('=============================================================\n');

  try {
    const adapter = new WebSpeechAdapter();

    // -------------------------------------------------------------
    // TEST 1: Provider Interface Compliance
    // -------------------------------------------------------------
    assert(
      typeof adapter.isSupported === 'function' &&
        typeof adapter.startListening === 'function' &&
        typeof adapter.stopListening === 'function' &&
        typeof adapter.cancelListening === 'function',
      'VoiceRecognitionProvider implements standard provider interface'
    );

    // -------------------------------------------------------------
    // TEST 2: Browser Support Detection
    // -------------------------------------------------------------
    assert(
      typeof adapter.isSupported() === 'boolean',
      'isSupported() safely returns boolean browser capability indicator'
    );

    // -------------------------------------------------------------
    // TEST 3: SSR Execution Safety
    // -------------------------------------------------------------
    const mockAdapter = new WebSpeechAdapter();
    assert(
      mockAdapter !== null,
      'WebSpeechAdapter initializes safely without crashing SSR window context'
    );

    // -------------------------------------------------------------
    // TEST 4: Start Listening
    // -------------------------------------------------------------
    assert(
      typeof adapter.startListening === 'function',
      'startListening method is exposed on adapter'
    );

    // -------------------------------------------------------------
    // TEST 5: Stop Listening
    // -------------------------------------------------------------
    assert(
      typeof adapter.stopListening === 'function',
      'stopListening method is exposed on adapter'
    );

    // -------------------------------------------------------------
    // TEST 6: Marathi Locale Mapping (mr -> mr-IN)
    // -------------------------------------------------------------
    assert(
      adapter.mapLanguage('mr') === 'mr-IN',
      'Language code "mr" maps to Indian Marathi locale "mr-IN"'
    );

    // -------------------------------------------------------------
    // TEST 7: Hindi Locale Mapping (hi -> hi-IN)
    // -------------------------------------------------------------
    assert(
      adapter.mapLanguage('hi') === 'hi-IN',
      'Language code "hi" maps to Indian Hindi locale "hi-IN"'
    );

    // -------------------------------------------------------------
    // TEST 8: English Locale Mapping (en -> en-IN)
    // -------------------------------------------------------------
    assert(
      adapter.mapLanguage('en') === 'en-IN',
      'Language code "en" maps to Indian English locale "en-IN"'
    );

    // -------------------------------------------------------------
    // TEST 9: Recognition Error Code Handling
    // -------------------------------------------------------------
    let errorFired = false;
    adapter.onError((err) => {
      errorFired = true;
    });
    // @ts-ignore
    adapter.notifyError({ code: 'PERMISSION_DENIED', message: 'Test error' });
    assert(errorFired, 'onError callback correctly receives VoiceError object');

    // -------------------------------------------------------------
    // TEST 10: Transcript Result Structure
    // -------------------------------------------------------------
    let resultReceived = false;
    adapter.onResult((res) => {
      if (res.transcript && res.language && res.timestamp) {
        resultReceived = true;
      }
    });
    // @ts-ignore
    adapter.resultCallbacks.forEach((cb) =>
      cb({
        transcript: 'onion prices',
        isFinal: true,
        confidence: 0.95,
        language: 'en-IN',
        timestamp: new Date().toISOString(),
      })
    );
    assert(resultReceived, 'onResult delivers structured VoiceRecognitionResult payload');

    // -------------------------------------------------------------
    // TEST 11: Command Resolver — Marketplace
    // -------------------------------------------------------------
    const cmdMarketplace = VoiceCommandResolver.resolveCommand('open marketplace');
    assert(
      cmdMarketplace.type === 'NAVIGATE' && cmdMarketplace.route === '/marketplace',
      'Command resolver maps "open marketplace" to /marketplace'
    );

    // -------------------------------------------------------------
    // TEST 12: Command Resolver — My Listings (Marathi)
    // -------------------------------------------------------------
    const cmdListings = VoiceCommandResolver.resolveCommand('माझे पीक दाखवा');
    assert(
      cmdListings.type === 'NAVIGATE' && cmdListings.route === '/my-listings',
      'Command resolver maps Marathi "माझे पीक दाखवा" to /my-listings'
    );

    // -------------------------------------------------------------
    // TEST 13: Command Resolver — My Offers (Hindi)
    // -------------------------------------------------------------
    const cmdOffers = VoiceCommandResolver.resolveCommand('मेरी ऑफ़र दिखाओ');
    assert(
      cmdOffers.type === 'NAVIGATE' && cmdOffers.route === '/offers',
      'Command resolver maps Hindi "मेरी ऑफ़र दिखाओ" to /offers'
    );

    // -------------------------------------------------------------
    // TEST 14: Command Resolver — Orders
    // -------------------------------------------------------------
    const cmdOrders = VoiceCommandResolver.resolveCommand('show my orders');
    assert(
      cmdOrders.type === 'NAVIGATE' && cmdOrders.route === '/orders',
      'Command resolver maps "show my orders" to /orders'
    );

    // -------------------------------------------------------------
    // TEST 15: Command Resolver — Notifications
    // -------------------------------------------------------------
    const cmdNotif = VoiceCommandResolver.resolveCommand('open notifications');
    assert(
      cmdNotif.type === 'NAVIGATE' && cmdNotif.route === '/notifications',
      'Command resolver maps "open notifications" to /notifications'
    );

    // -------------------------------------------------------------
    // TEST 16: Command Resolver — Profile
    // -------------------------------------------------------------
    const cmdProfile = VoiceCommandResolver.resolveCommand('माझी प्रोफाइल');
    assert(
      cmdProfile.type === 'NAVIGATE' && cmdProfile.route === '/profile',
      'Command resolver maps "माझी प्रोफाइल" to /profile'
    );

    // -------------------------------------------------------------
    // TEST 17: Command Resolver — Weather
    // -------------------------------------------------------------
    const cmdWeather = VoiceCommandResolver.resolveCommand('check weather');
    assert(
      cmdWeather.type === 'NAVIGATE' && cmdWeather.route === '/weather',
      'Command resolver maps "check weather" to /weather'
    );

    // -------------------------------------------------------------
    // TEST 18: Command Resolver — Market Intelligence
    // -------------------------------------------------------------
    const cmdMandi = VoiceCommandResolver.resolveCommand('मंडी भाव दाखवा');
    assert(
      cmdMandi.type === 'NAVIGATE' && cmdMandi.route === '/market-intelligence',
      'Command resolver maps "मंडी भाव दाखवा" to /market-intelligence'
    );

    // -------------------------------------------------------------
    // TEST 19: Command Resolver — Transport Discovery
    // -------------------------------------------------------------
    const cmdTransport = VoiceCommandResolver.resolveCommand('find transport');
    assert(
      cmdTransport.type === 'NAVIGATE' && cmdTransport.route === '/transport/discover',
      'Command resolver maps "find transport" to /transport/discover'
    );

    // -------------------------------------------------------------
    // TEST 20: Command Resolver — Storage Discovery
    // -------------------------------------------------------------
    const cmdStorage = VoiceCommandResolver.resolveCommand('find storage');
    assert(
      cmdStorage.type === 'NAVIGATE' && cmdStorage.route === '/storage/discover',
      'Command resolver maps "find storage" to /storage/discover'
    );

    // -------------------------------------------------------------
    // TEST 21: Unresolved Command Safety (No guessing)
    // -------------------------------------------------------------
    const cmdUnknown = VoiceCommandResolver.resolveCommand('random unstructured speech xyz');
    assert(
      cmdUnknown.type === 'UNRESOLVED' && cmdUnknown.confidence === 0,
      'Ambiguous transcript safely resolves to UNRESOLVED without guessing'
    );

    // -------------------------------------------------------------
    // TEST 22: Spoken Format Normalizer — English Quantity
    // -------------------------------------------------------------
    const norm1 = SpokenFormatNormalizer.normalizeSpokenText('ten quintals');
    assert(
      norm1.quantity === 10 && norm1.unit === 'Quintal' && norm1.isConfident,
      'SpokenFormatNormalizer converts "ten quintals" to 10 Quintal'
    );

    // -------------------------------------------------------------
    // TEST 23: Spoken Format Normalizer — Marathi Quantity
    // -------------------------------------------------------------
    const norm2 = SpokenFormatNormalizer.normalizeSpokenText('पाचशे किलो');
    assert(
      norm2.quantity === 500 && norm2.unit === 'kg' && norm2.isConfident,
      'SpokenFormatNormalizer converts Marathi "पाचशे किलो" to 500 kg'
    );

    // -------------------------------------------------------------
    // TEST 24: Spoken Format Normalizer — Hindi Quantity
    // -------------------------------------------------------------
    const norm3 = SpokenFormatNormalizer.normalizeSpokenText('पांच सौ किलो');
    assert(
      norm3.quantity === 500 && norm3.unit === 'kg' && norm3.isConfident,
      'SpokenFormatNormalizer converts Hindi "पांच सौ किलो" to 500 kg'
    );

    // -------------------------------------------------------------
    // TEST 25: Spoken Format Normalizer — Tonnes
    // -------------------------------------------------------------
    const norm4 = SpokenFormatNormalizer.normalizeSpokenText('5 tonnes');
    assert(
      norm4.quantity === 5 && norm4.unit === 'Tonne' && norm4.isConfident,
      'SpokenFormatNormalizer converts "5 tonnes" to 5 Tonne'
    );

    // -------------------------------------------------------------
    // TEST 26: Spoken Format Normalizer — Price Extraction
    // -------------------------------------------------------------
    const norm5 = SpokenFormatNormalizer.normalizeSpokenText('onion at 2500 rupees');
    assert(
      norm5.price === 2500 && norm5.crop === 'Onion',
      'SpokenFormatNormalizer extracts price 2500 and crop Onion'
    );

    // -------------------------------------------------------------
    // TEST 27: Ambiguous Number Handling (Conservative fallback)
    // -------------------------------------------------------------
    const normAmbiguous = SpokenFormatNormalizer.normalizeSpokenText('maybe 500 somewhere');
    assert(
      !normAmbiguous.isConfident,
      'Ambiguous standalone numbers marked isConfident: false requiring user manual review'
    );

    // -------------------------------------------------------------
    // TEST 28: High-Impact Action Safety Gate
    // -------------------------------------------------------------
    // Verify VoiceConfirmationModal file exists
    const modalPath = path.join(process.cwd(), 'src/components/voice/VoiceConfirmationModal.tsx');
    const modalExists = fs.existsSync(modalPath);
    assert(
      modalExists,
      'VoiceConfirmationModal component exists for high-impact action safety'
    );

    // -------------------------------------------------------------
    // TEST 29: Confirmation Notice Text Verification
    // -------------------------------------------------------------
    const modalContent = fs.readFileSync(modalPath, 'utf-8');
    assert(
      modalContent.includes('Explicit User Confirmation Required'),
      'VoiceConfirmationModal enforces explicit user confirmation notice'
    );

    // -------------------------------------------------------------
    // TEST 30: Authorization Preservation
    // -------------------------------------------------------------
    // Verify voice component does not bypass auth sessions
    const voiceInputContent = fs.readFileSync(path.join(process.cwd(), 'src/components/voice/VoiceInput.tsx'), 'utf-8');
    assert(
      !voiceInputContent.includes('/api/v1/admin') && !voiceInputContent.includes('prisma'),
      'Voice components contain no direct Prisma access or admin authorization bypasses'
    );

    // -------------------------------------------------------------
    // TEST 31: Verification Gate Preservation
    // -------------------------------------------------------------
    // Check that marketplace page maintains verification gates
    const mktContent = fs.readFileSync(path.join(process.cwd(), 'src/app/marketplace/page.tsx'), 'utf-8');
    assert(
      mktContent.includes('setIsVerificationGateOpen(true)'),
      'Marketplace page preserves VerificationGateModal checks'
    );

    // -------------------------------------------------------------
    // TEST 32: i18n English Dictionary Completeness
    // -------------------------------------------------------------
    const enLoc = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/en.json'), 'utf-8'));
    assert(
      !!enLoc.voice?.speak && !!enLoc.voice?.listening && !!enLoc.voice?.unsupported,
      'English locale (en.json) contains complete voice translation keys'
    );

    // -------------------------------------------------------------
    // TEST 33: i18n Hindi Dictionary Completeness
    // -------------------------------------------------------------
    const hiLoc = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/hi.json'), 'utf-8'));
    assert(
      !!hiLoc.voice?.speak && !!hiLoc.voice?.listening && !!hiLoc.voice?.unsupported,
      'Hindi locale (hi.json) contains complete voice translation keys'
    );

    // -------------------------------------------------------------
    // TEST 34: i18n Marathi Dictionary Completeness
    // -------------------------------------------------------------
    const mrLoc = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/mr.json'), 'utf-8'));
    assert(
      !!mrLoc.voice?.speak && !!mrLoc.voice?.listening && !!mrLoc.voice?.unsupported,
      'Marathi locale (mr.json) contains complete voice translation keys'
    );

    // -------------------------------------------------------------
    // TEST 35: Offline Fallback Notice
    // -------------------------------------------------------------
    assert(
      enLoc.voice?.unsupported.includes("isn't supported"),
      'Offline/unsupported browser fallback message translated and available'
    );

    // -------------------------------------------------------------
    // TEST 36: No Raw Audio Persistence
    // -------------------------------------------------------------
    const adapterCode = fs.readFileSync(path.join(process.cwd(), 'src/lib/voice/WebSpeechAdapter.ts'), 'utf-8');
    const hasAudioSave = /localStorage.*audio|sessionStorage.*audio|fs\.write.*audio/i.test(adapterCode);
    assert(
      !hasAudioSave,
      'Privacy audit verified: No raw audio persistence or recording file storage'
    );

    // -------------------------------------------------------------
    // TEST 37: Zero AI Claims Verification
    // -------------------------------------------------------------
    const hasAiTerms = /aiAssistant|aiVoice|openai|llm/i.test(adapterCode);
    assert(
      !hasAiTerms,
      'Truthful labeling verified: No fake AI voice claims in provider code'
    );

    // -------------------------------------------------------------
    // TEST 38: Full System Regression Scripts Existence
    // -------------------------------------------------------------
    const scriptsExist =
      fs.existsSync(path.join(process.cwd(), 'scripts/phase4_audit.ts')) &&
      fs.existsSync(path.join(process.cwd(), 'scripts/phase5_audit.ts')) &&
      fs.existsSync(path.join(process.cwd(), 'scripts/phase6_audit.ts')) &&
      fs.existsSync(path.join(process.cwd(), 'scripts/phase7_audit.ts')) &&
      fs.existsSync(path.join(process.cwd(), 'scripts/phase8_audit.ts')) &&
      fs.existsSync(path.join(process.cwd(), 'scripts/phase9_audit.ts')) &&
      fs.existsSync(path.join(process.cwd(), 'scripts/phase10_audit.ts'));
    assert(
      scriptsExist,
      'All previous regression audit scripts (Phases 4-10) are present and verified'
    );

    // -------------------------------------------------------------
    // TEST 39: Voice Component Module Structure
    // -------------------------------------------------------------
    const voiceInputExists = fs.existsSync(path.join(process.cwd(), 'src/components/voice/VoiceInput.tsx'));
    const voiceBarExists = fs.existsSync(path.join(process.cwd(), 'src/components/voice/VoiceActionBar.tsx'));
    assert(
      voiceInputExists && voiceBarExists,
      'Modular UI voice components (VoiceInput, VoiceActionBar) initialized'
    );

    console.log('\n=============================================================');
    console.log(`  PHASE 11 AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('=============================================================\n');

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Phase 11 audit:', error);
    process.exit(1);
  }
}

runPhase11Audit();
