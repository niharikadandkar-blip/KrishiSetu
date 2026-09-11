export type VoiceCommandType =
  | 'NAVIGATE'
  | 'QUERY_MARKET'
  | 'QUERY_WEATHER'
  | 'SEARCH_MARKETPLACE'
  | 'UNRESOLVED';

export interface VoiceResolvedCommand {
  type: VoiceCommandType;
  route?: string;
  query?: string;
  crop?: string;
  rawTranscript: string;
  confidence: number;
}

export const VoiceCommandResolver = {
  resolveCommand(transcript: string): VoiceResolvedCommand {
    if (!transcript || transcript.trim().length === 0) {
      return { type: 'UNRESOLVED', rawTranscript: transcript || '', confidence: 0 };
    }

    const cleaned = transcript.toLowerCase().trim();

    // 1. Deterministic Navigation Commands (EN / HI / MR)
    const navMappings: Array<{ keywords: string[]; route: string }> = [
      {
        keywords: [
          'open marketplace', 'show marketplace', 'go to marketplace', 'marketplace',
          'मार्केटप्लेस', 'बाजार दाखवा', 'बाजारपेठ', 'बाजार', 'मंडी दिखाओ'
        ],
        route: '/marketplace',
      },
      {
        keywords: [
          'show my listings', 'my listings', 'my crops', 'crop listings',
          'माझे पीक', 'माझे लिस्टिंग्स', 'माझी पिके', 'मेरी लिस्टिंग'
        ],
        route: '/my-listings',
      },
      {
        keywords: [
          'open offers', 'show offers', 'my offers', 'bids',
          'माझे प्रस्ताव', 'प्रस्ताव', 'मेरी ऑफ़र', 'बोली'
        ],
        route: '/offers',
      },
      {
        keywords: [
          'show my orders', 'my orders', 'show orders', 'orders',
          'माझ्या ऑर्डर्स', 'ऑर्डर्स', 'ऑर्डर', 'मेरे ऑर्डर्स'
        ],
        route: '/orders',
      },
      {
        keywords: [
          'open notifications', 'show notifications', 'notifications', 'alerts',
          'सूचना', 'सूचनाएं', 'नोटिफिकेशन', 'अलर्ट'
        ],
        route: '/notifications',
      },
      {
        keywords: [
          'open profile', 'show profile', 'my profile',
          'माझी प्रोफाइल', 'प्रोफाइल', 'मेरी प्रोफ़ाइल', 'प्रोफ़ाइल'
        ],
        route: '/profile',
      },
      {
        keywords: [
          'show weather', 'check weather', 'weather forecast', 'weather',
          'हवामान', 'हवामान अंदाज', 'मौसम दिखाओ', 'मौसम'
        ],
        route: '/weather',
      },
      {
        keywords: [
          'show market prices', 'market intelligence', 'mandi prices', 'price trend',
          'मंडी भाव', 'बाजार भाव', 'पिकांचे भाव', 'भाव', 'बाजार भाव ट्रेंड'
        ],
        route: '/market-intelligence',
      },
      {
        keywords: [
          'find transport', 'show transport', 'transport', 'vehicles',
          'वाहतूक', 'वाहतूक शोधा', 'गाडी शोधा', 'परिवहन'
        ],
        route: '/transport/discover',
      },
      {
        keywords: [
          'find storage', 'show storage', 'storage', 'warehouse', 'cold storage',
          'साठवणूक', 'गोदाम', 'कोल्ड स्टोरेज', 'भंडारण'
        ],
        route: '/storage/discover',
      },
      {
        keywords: [
          'show saved lots', 'saved listings', 'saved lots',
          'जतन केलेले लॉट', 'सेव किए गए लॉट'
        ],
        route: '/saved-lots',
      },
    ];

    for (const mapping of navMappings) {
      if (mapping.keywords.some((kw) => cleaned.includes(kw))) {
        return {
          type: 'NAVIGATE',
          route: mapping.route,
          rawTranscript: transcript,
          confidence: 0.95,
        };
      }
    }

    // 2. Crop Price Queries (Market Intelligence Intent)
    const priceKeywords = ['price', 'rate', 'भाव', 'दाम', 'कीमत'];
    const hasPriceKw = priceKeywords.some((kw) => cleaned.includes(kw));

    const cropList = [
      { name: 'onion', aliases: ['onion', 'onions', 'कांदा', 'प्याज'] },
      { name: 'potato', aliases: ['potato', 'potatoes', 'बटाटा', 'आलू'] },
      { name: 'wheat', aliases: ['wheat', 'गहू', 'गेहूं'] },
      { name: 'soybean', aliases: ['soybean', 'soya', 'सोयाबीन'] },
      { name: 'cotton', aliases: ['cotton', 'कापूस', 'कपास'] },
      { name: 'pomegranate', aliases: ['pomegranate', 'डाळिंब', 'अनार'] },
      { name: 'grapes', aliases: ['grapes', 'द्राक्षे', 'अंगूर'] },
      { name: 'tomato', aliases: ['tomato', 'tomatoes', 'टोमॅटो', 'टमाटर'] },
      { name: 'maize', aliases: ['maize', 'corn', 'मका', 'मक्का'] },
    ];

    let matchedCrop: string | undefined;
    for (const c of cropList) {
      if (c.aliases.some((alias) => cleaned.includes(alias))) {
        matchedCrop = c.name;
        break;
      }
    }

    if (hasPriceKw && matchedCrop) {
      return {
        type: 'QUERY_MARKET',
        crop: matchedCrop,
        query: transcript,
        route: `/market-intelligence?crop=${encodeURIComponent(matchedCrop)}`,
        rawTranscript: transcript,
        confidence: 0.9,
      };
    }

    // 3. Marketplace Search Query
    const searchKeywords = ['search', 'find', 'buy', 'sell', 'शोधा', 'खरेदी', 'शोधावा', 'खोजो'];
    if (searchKeywords.some((kw) => cleaned.includes(kw)) || matchedCrop) {
      const queryText = matchedCrop || cleaned.replace(/(search|find|show|look for|शोधा|खोजो)/gi, '').trim();
      return {
        type: 'SEARCH_MARKETPLACE',
        query: queryText,
        route: `/marketplace?search=${encodeURIComponent(queryText)}`,
        rawTranscript: transcript,
        confidence: 0.8,
      };
    }

    // 4. Fallback to UNRESOLVED (Never guess consequential or unknown intent)
    return {
      type: 'UNRESOLVED',
      rawTranscript: transcript,
      confidence: 0,
    };
  },
};
