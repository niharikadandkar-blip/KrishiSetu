import { db } from '@/lib/db';
import { calculateHaversineDistance } from '@/lib/repositories/lotRepository';
import { BuyerRequirementInput, MatchingScoreResult, MatchingFactor } from '@/lib/types/phase3';

// Configurable Scoring Weight Configuration (Total = 100)
export const DEFAULT_MATCHING_WEIGHTS = {
  CROP: 35,
  PRICE: 25,
  DISTANCE: 20,
  QUANTITY: 10,
  HARVEST_TIMING: 10,
};

export const buyerRequirementService = {
  async createRequirement(input: BuyerRequirementInput) {
    return db.rFQAndInquiry.create({
      data: {
        buyerId: input.buyerId,
        targetCrop: input.targetCrop,
        targetVariety: input.targetVariety || null,
        requiredQuantity: input.requiredQuantity,
        unit: input.unit || 'Quintal',
        targetGrade: input.targetGrade || null,
        budgetPricePerUnit: input.budgetPricePerUnit,
        deliveryDistrict: input.deliveryDistrict,
        deliveryAddress: input.deliveryAddress || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        requiredByDate: new Date(input.requiredByDate),
        status: 'OPEN',
      },
    });
  },

  async getBuyerRequirements(buyerId: string) {
    return db.rFQAndInquiry.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Deterministic & Explainable Compatibility Engine
   * Calculates transparent factor breakdown without arbitrary "AI" percentages.
   */
  calculateLotMatchScore(
    rfq: {
      targetCrop: string;
      targetVariety?: string | null;
      requiredQuantity: number;
      budgetPricePerUnit: number;
      deliveryDistrict: string;
      requiredByDate: Date | string;
      latitude?: number | null;
      longitude?: number | null;
    },
    lot: {
      id: string;
      cropName: string;
      variety?: string | null;
      quantityAvailable: number;
      askPricePerUnit: number;
      expectedHarvestDate: Date | string;
      publicDistrict: string;
      latitude?: number | null;
      longitude?: number | null;
    },
    weights = DEFAULT_MATCHING_WEIGHTS
  ): MatchingScoreResult {
    const factors: MatchingFactor[] = [];

    // 1. Crop & Variety Factor (Weight: 35)
    const cropMatch = rfq.targetCrop.toLowerCase().trim() === lot.cropName.toLowerCase().trim();
    let cropScore = 0;
    let cropExplanation = '';

    if (cropMatch) {
      cropScore = weights.CROP;
      const varietyMatched =
        rfq.targetVariety && lot.variety
          ? rfq.targetVariety.toLowerCase().trim() === lot.variety.toLowerCase().trim()
          : false;
      cropExplanation = varietyMatched
        ? `Exact crop match (${lot.cropName}) and variety match (${lot.variety}) (+${weights.CROP}%)`
        : `Exact crop match (${lot.cropName}) (+${weights.CROP}%)`;
    } else {
      cropExplanation = `Crop mismatch (${rfq.targetCrop} required vs ${lot.cropName} listed) (0%)`;
    }

    factors.push({
      category: 'CROP',
      score: cropScore,
      weight: weights.CROP,
      matched: cropMatch,
      explanation: cropExplanation,
    });

    // 2. Target Price Budget Factor (Weight: 25)
    let priceScore = 0;
    let priceExplanation = '';
    const askPrice = lot.askPricePerUnit;
    const budgetPrice = rfq.budgetPricePerUnit;

    if (askPrice <= budgetPrice) {
      priceScore = weights.PRICE;
      const savings = budgetPrice - askPrice;
      priceExplanation =
        savings > 0
          ? `Listing price ₹${askPrice} is ₹${savings}/unit below budget ₹${budgetPrice} (+${weights.PRICE}%)`
          : `Listing price ₹${askPrice} matches exact budget limit ₹${budgetPrice} (+${weights.PRICE}%)`;
    } else {
      const overpct = Math.round(((askPrice - budgetPrice) / budgetPrice) * 100);
      if (overpct <= 10) {
        priceScore = Math.round(weights.PRICE * 0.6);
        priceExplanation = `Listing price ₹${askPrice} is slightly above budget by ${overpct}% (+${priceScore}%)`;
      } else {
        priceScore = 0;
        priceExplanation = `Price ₹${askPrice} exceeds buyer budget ₹${budgetPrice} by ${overpct}% (0%)`;
      }
    }

    factors.push({
      category: 'PRICE',
      score: priceScore,
      weight: weights.PRICE,
      matched: priceScore > 0,
      explanation: priceExplanation,
    });

    // 3. Distance & Location Factor (Weight: 20)
    let distanceScore = 0;
    let distanceExplanation = '';

    if (rfq.latitude && rfq.longitude && lot.latitude && lot.longitude) {
      const dist = calculateHaversineDistance(rfq.latitude, rfq.longitude, lot.latitude, lot.longitude);
      if (dist <= 25) {
        distanceScore = weights.DISTANCE;
        distanceExplanation = `Close proximity: ${dist} km away (+${weights.DISTANCE}%)`;
      } else if (dist <= 50) {
        distanceScore = Math.round(weights.DISTANCE * 0.75);
        distanceExplanation = `Regional proximity: ${dist} km away (+${distanceScore}%)`;
      } else if (dist <= 100) {
        distanceScore = Math.round(weights.DISTANCE * 0.5);
        distanceExplanation = `Extended distance: ${dist} km away (+${distanceScore}%)`;
      } else {
        distanceScore = Math.round(weights.DISTANCE * 0.2);
        distanceExplanation = `Long distance: ${dist} km away (+${distanceScore}%)`;
      }
    } else {
      const districtMatch = rfq.deliveryDistrict.toLowerCase() === lot.publicDistrict.toLowerCase();
      distanceScore = districtMatch ? weights.DISTANCE : Math.round(weights.DISTANCE * 0.5);
      distanceExplanation = districtMatch
        ? `Same district match (${lot.publicDistrict}) (+${weights.DISTANCE}%)`
        : `Neighboring district (${lot.publicDistrict}) (+${distanceScore}%)`;
    }

    factors.push({
      category: 'LOCATION',
      score: distanceScore,
      weight: weights.DISTANCE,
      matched: distanceScore > 0,
      explanation: distanceExplanation,
    });

    // 4. Quantity Availability Factor (Weight: 10)
    let quantityScore = 0;
    let quantityExplanation = '';
    const avail = lot.quantityAvailable;
    const req = rfq.requiredQuantity;

    if (avail >= req) {
      quantityScore = weights.QUANTITY;
      quantityExplanation = `Full quantity available (${avail} available >= ${req} required) (+${weights.QUANTITY}%)`;
    } else {
      const ratio = avail / req;
      quantityScore = Math.round(weights.QUANTITY * ratio);
      quantityExplanation = `Partial quantity available (${avail} available vs ${req} required) (+${quantityScore}%)`;
    }

    factors.push({
      category: 'QUANTITY',
      score: quantityScore,
      weight: weights.QUANTITY,
      matched: quantityScore > 0,
      explanation: quantityExplanation,
    });

    // 5. Harvest Date Timing Factor (Weight: 10)
    let harvestScore = 0;
    let harvestExplanation = '';
    const reqDate = new Date(rfq.requiredByDate).getTime();
    const harvestDate = new Date(lot.expectedHarvestDate).getTime();

    if (harvestDate <= reqDate) {
      harvestScore = weights.HARVEST_TIMING;
      harvestExplanation = `Ready on time before required date (+${weights.HARVEST_TIMING}%)`;
    } else {
      const diffDays = Math.ceil((harvestDate - reqDate) / 86400000);
      if (diffDays <= 7) {
        harvestScore = Math.round(weights.HARVEST_TIMING * 0.5);
        harvestExplanation = `Harvest date is ${diffDays} days after required date (+${harvestScore}%)`;
      } else {
        harvestScore = 0;
        harvestExplanation = `Harvest date is ${diffDays} days delayed (0%)`;
      }
    }

    factors.push({
      category: 'HARVEST_DATE',
      score: harvestScore,
      weight: weights.HARVEST_TIMING,
      matched: harvestScore > 0,
      explanation: harvestExplanation,
    });

    // Total Score Calculation
    const totalScore = factors.reduce((sum, f) => sum + f.score, 0);

    let matchGrade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW' = 'LOW';
    if (totalScore >= 80) matchGrade = 'EXCELLENT';
    else if (totalScore >= 60) matchGrade = 'GOOD';
    else if (totalScore >= 40) matchGrade = 'MODERATE';

    return {
      totalScore,
      matchGrade,
      factors,
      lotId: lot.id,
    };
  },
};
