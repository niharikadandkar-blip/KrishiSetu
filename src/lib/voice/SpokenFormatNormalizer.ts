export interface NormalizedSpokenQuantity {
  quantity?: number;
  unit?: 'Quintal' | 'Tonne' | 'kg';
  price?: number;
  crop?: string;
  rawText: string;
  isConfident: boolean;
}

export const SpokenFormatNormalizer = {
  normalizeSpokenText(text: string): NormalizedSpokenQuantity {
    if (!text || text.trim().length === 0) {
      return { rawText: text || '', isConfident: false };
    }

    const cleaned = text.toLowerCase().trim();
    let quantity: number | undefined;
    let unit: 'Quintal' | 'Tonne' | 'kg' | undefined;
    let price: number | undefined;
    let crop: string | undefined;
    let isConfident = false;

    // 1. Spoken Word Number Replacements (EN / HI / MR) without relying on Latin \b for Devanagari
    let processed = ` ${cleaned} `
      .replace(/\s(five hundred|पाचशे|पांच सौ)\s/g, ' 500 ')
      .replace(/\s(two hundred|दोनशे|दो सौ)\s/g, ' 200 ')
      .replace(/\s(one hundred|शंभर|सौ)\s/g, ' 100 ')
      .replace(/\s(one thousand|एक हजार)\s/g, ' 1000 ')
      .replace(/\s(ten|दहा|दस)\s/g, ' 10 ')
      .replace(/\s(twenty five|पंचवीस|पच्चीस)\s/g, ' 25 ')
      .replace(/\s(fifty|पन्नास|पचास)\s/g, ' 50 ')
      .replace(/\s(one|एक)\s/g, ' 1 ')
      .replace(/\s(two|दोन|दो)\s/g, ' 2 ')
      .replace(/\s(three|तीन)\s/g, ' 3 ')
      .replace(/\s(four|चार)\s/g, ' 4 ')
      .replace(/\s(five|पाच|पांच)\s/g, ' 5 ');

    // 2. Extract Quantity & Unit
    const quintalRegex = /(\d+(?:\.\d+)?)\s*(quintals?|quintal|कुंटल|क्विंटल|कविवंटल)/i;
    const tonneRegex = /(\d+(?:\.\d+)?)\s*(tonnes?|tonne|tons?|टन)/i;
    const kgRegex = /(\d+(?:\.\d+)?)\s*(kilos?|kg|kilograms?|किलो|किग्रा)/i;

    let qMatch = processed.match(quintalRegex);
    if (qMatch) {
      quantity = parseFloat(qMatch[1]);
      unit = 'Quintal';
      isConfident = true;
    } else {
      qMatch = processed.match(tonneRegex);
      if (qMatch) {
        quantity = parseFloat(qMatch[1]);
        unit = 'Tonne';
        isConfident = true;
      } else {
        qMatch = processed.match(kgRegex);
        if (qMatch) {
          quantity = parseFloat(qMatch[1]);
          unit = 'kg';
          isConfident = true;
        }
      }
    }

    // 3. Extract Price / Rate
    const priceMatch = processed.match(/(?:at|for|कीमत|भाव)\s*(\d+(?:\.\d+)?)/i) || processed.match(/(\d+)\s*(?:rupees|रुपये)/i);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]);
    }

    // 4. Extract Crop Name
    const cropAliases = [
      { name: 'Onion', matches: ['onion', 'कांदा', 'प्याज'] },
      { name: 'Potato', matches: ['potato', 'बटाटा', 'आलू'] },
      { name: 'Wheat', matches: ['wheat', 'गहू', 'गेहूं'] },
      { name: 'Soybean', matches: ['soybean', 'सोयाबीन'] },
      { name: 'Cotton', matches: ['cotton', 'कापूस', 'कपास'] },
    ];

    for (const c of cropAliases) {
      if (c.matches.some((m) => processed.includes(m))) {
        crop = c.name;
        break;
      }
    }

    // If standalone number without unit exists, attempt extraction
    if (!quantity) {
      const standaloneNum = processed.match(/\b(\d+(?:\.\d+)?)\b/);
      if (standaloneNum) {
        quantity = parseFloat(standaloneNum[1]);
        // Leave unit undefined if uncertain so user edits/confirms
        isConfident = false;
      }
    }

    return {
      quantity,
      unit,
      price,
      crop,
      rawText: text,
      isConfident,
    };
  },
};
