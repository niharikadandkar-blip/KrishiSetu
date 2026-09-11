import {
  IAITaskProvider,
  AIAgentRequest,
  AIAgentResponse,
} from './AITaskProvider';

export class AIDemoAdapter implements IAITaskProvider {
  public providerName = 'KrishiSetu AI Demo Adapter';
  public isDemoMode = true;

  public async processTask(request: AIAgentRequest): Promise<AIAgentResponse> {
    const text = request.userInput.trim().toLowerCase();

    // Navigation intent checks
    if (text.includes('marketplace') || text.includes('बाजारपेठ') || text.includes('मंडी')) {
      if (text.includes('open') || text.includes('दाखवा') || text.includes('दिखाओ') || text.includes('go to')) {
        return {
          responseType: 'NAVIGATION',
          intent: 'NAVIGATE',
          entities: { target: '/marketplace' },
          requestedTool: 'navigate_to',
          toolArguments: { path: '/marketplace' },
          requiresConfirmation: false,
          responseMessage: 'Navigating to Marketplace...',
          isDemoMode: true,
        };
      }
    }

    if (text.includes('weather') || text.includes('हवामान') || text.includes('मौसम')) {
      return {
        responseType: 'TOOL_RESULT',
        intent: 'CHECK_WEATHER',
        entities: { district: 'Nashik' },
        requestedTool: 'check_weather',
        toolArguments: { district: 'Nashik' },
        requiresConfirmation: false,
        responseMessage: 'Fetching weather observation for Nashik...',
        isDemoMode: true,
      };
    }

    if (text.includes('orders') || text.includes('आदेश') || text.includes('ऑर्डर')) {
      return {
        responseType: 'NAVIGATION',
        intent: 'NAVIGATE',
        entities: { target: '/orders' },
        requestedTool: 'navigate_to',
        toolArguments: { path: '/orders' },
        requiresConfirmation: false,
        responseMessage: 'Navigating to Orders...',
        isDemoMode: true,
      };
    }

    if (text.includes('offers') || text.includes('ऑफर') || text.includes('बोली')) {
      return {
        responseType: 'NAVIGATION',
        intent: 'NAVIGATE',
        entities: { target: '/offers' },
        requestedTool: 'navigate_to',
        toolArguments: { path: '/offers' },
        requiresConfirmation: false,
        responseMessage: 'Navigating to Offers...',
        isDemoMode: true,
      };
    }

    // Market prices search (requires crop or market context)
    const isPriceQuery = text.includes('price') || text.includes('भाव') || text.includes('दाम');
    const hasCropOrMandi =
      text.includes('onion') || text.includes('potato') || text.includes('soybean') || text.includes('cotton') ||
      text.includes('कांदा') || text.includes('बटाटा') || text.includes('सोयाबीन') || text.includes('कापूस') ||
      text.includes('market') || text.includes('mandi');

    if (isPriceQuery && hasCropOrMandi) {
      let crop = 'Onion';
      if (text.includes('potato') || text.includes('बटाटा')) crop = 'Potato';
      if (text.includes('soybean') || text.includes('सोयाबीन')) crop = 'Soybean';
      if (text.includes('cotton') || text.includes('कापूस')) crop = 'Cotton';

      return {
        responseType: 'TOOL_RESULT',
        intent: 'SEARCH_MARKET_PRICE',
        entities: { crop, district: 'Nashik' },
        requestedTool: 'search_market_prices',
        toolArguments: { crop, district: 'Nashik' },
        requiresConfirmation: false,
        responseMessage: `Fetching latest market prices for ${crop}...`,
        isDemoMode: true,
      };
    }

    // Transport discovery
    if (text.includes('transport') || text.includes('वाहतूक') || text.includes('परिवहन')) {
      return {
        responseType: 'TOOL_RESULT',
        intent: 'FIND_TRANSPORT',
        entities: { district: 'Nashik' },
        requestedTool: 'find_transport',
        toolArguments: { district: 'Nashik' },
        requiresConfirmation: false,
        responseMessage: 'Discovering available transport providers in Nashik...',
        isDemoMode: true,
      };
    }

    // Storage discovery
    if (text.includes('storage') || text.includes('गोदाम') || text.includes('साठवणूक')) {
      return {
        responseType: 'TOOL_RESULT',
        intent: 'FIND_STORAGE',
        entities: { district: 'Nashik' },
        requestedTool: 'find_storage',
        toolArguments: { district: 'Nashik' },
        requiresConfirmation: false,
        responseMessage: 'Discovering available storage facilities in Nashik...',
        isDemoMode: true,
      };
    }

    // Listing creation preview
    if (text.includes('create listing') || text.includes('नवीन शेतमाल') || text.includes('शेतमाल विका')) {
      if (!text.includes('quintal') && !text.includes('क्विंटल') && !text.includes('kg')) {
        return {
          responseType: 'CLARIFICATION_REQUIRED',
          intent: 'CREATE_CROP_LISTING',
          entities: { crop: 'Onion' },
          requestedTool: null,
          toolArguments: {},
          requiresConfirmation: false,
          responseMessage: 'Please specify the quantity in quintals and your asking price per quintal.',
          isDemoMode: true,
        };
      }

      return {
        responseType: 'CONFIRMATION_REQUIRED',
        intent: 'CREATE_CROP_LISTING',
        entities: { crop: 'Onion', quantityAvailable: 10, askPricePerUnit: 2500, publicDistrict: 'Nashik' },
        requestedTool: 'prepare_crop_listing',
        toolArguments: {
          cropName: 'Onion',
          quantityAvailable: 10,
          unit: 'Quintal',
          askPricePerUnit: 2500,
          publicDistrict: 'Nashik',
          publicTaluka: 'Niphad',
          publicVillage: 'Pimplas',
        },
        requiresConfirmation: true,
        responseMessage: 'Please review the listing preview details below before submitting.',
        isDemoMode: true,
      };
    }

    // Default Unsupported Request response
    return {
      responseType: 'UNSUPPORTED_REQUEST',
      intent: 'UNKNOWN',
      entities: {},
      requestedTool: null,
      toolArguments: {},
      requiresConfirmation: false,
      responseMessage: 'In AI Demo Mode: This request is unsupported. Try asking for "onion prices", "check weather", or "find transport".',
      isDemoMode: true,
    };
  }
}
