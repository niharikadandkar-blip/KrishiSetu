import { z } from 'zod';
import { db } from '@/lib/db';
import { marketBenchmarkService } from '@/lib/services/marketBenchmarkService';
import { getWeatherDataProvider } from '@/lib/services/weather/weatherDataProviderFactory';
import { buyerRequirementService } from '@/lib/services/buyerRequirementService';
import { lotRepository } from '@/lib/repositories/lotRepository';
import { biddingRepository } from '@/lib/repositories/biddingRepository';
import { orderRepository } from '@/lib/repositories/orderRepository';
import { transportRepository } from '@/lib/repositories/transportRepository';
import { storageRepository } from '@/lib/repositories/storageRepository';
import { reportRepository } from '@/lib/repositories/reportRepository';
import { previewTokenStore } from './PreviewTokenStore';

export interface ToolDefinition {
  name: string;
  description: string;
  readOnly: boolean;
  requiredRole?: 'FARMER' | 'BUYER' | 'TRANSPORTER' | 'STORAGE_OWNER' | 'ADMIN';
  requiredVerification?: boolean;
  confirmationRequired: boolean;
  inputSchema: z.ZodType<any>;
  execute: (args: unknown, context: { userId: string; role: string; profileVerified?: boolean }) => Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    previewId?: string;
    previewPayload?: Record<string, unknown>;
  }>;
}

const RouteAllowlist = [
  '/marketplace',
  '/my-listings',
  '/offers',
  '/orders',
  '/notifications',
  '/profile',
  '/weather',
  '/market-intelligence',
  '/transport/discover',
  '/storage/discover',
];

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor() {
    this.registerTools();
  }

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  private registerTools(): void {
    // 1. search_market_prices
    this.register({
      name: 'search_market_prices',
      description: 'Search APMC mandi benchmark prices by crop and district',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({
        crop: z.string().optional(),
        district: z.string().optional(),
      }),
      execute: async (rawArgs, _ctx) => {
        const args = z.object({ crop: z.string().optional(), district: z.string().optional() }).parse(rawArgs);
        const records = await marketBenchmarkService.getBenchmarks(args.district || 'Nashik');
        const filtered = args.crop
          ? records.filter((r) => r.cropName.toLowerCase().includes(args.crop!.toLowerCase()))
          : records;
        return { success: true, data: filtered };
      },
    });

    // 2. compare_markets
    this.register({
      name: 'compare_markets',
      description: 'Compare crop benchmark prices across districts',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({
        crop: z.string(),
        districts: z.array(z.string()).optional(),
      }),
      execute: async (rawArgs, _ctx) => {
        const args = z.object({ crop: z.string(), districts: z.array(z.string()).optional() }).parse(rawArgs);
        const records = await marketBenchmarkService.getBenchmarks('Nashik');
        return { success: true, data: records };
      },
    });

    // 3. view_price_trend
    this.register({
      name: 'view_price_trend',
      description: 'Fetch historical price trend and outlook indicator',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({
        crop: z.string(),
        district: z.string().optional(),
      }),
      execute: async (rawArgs, _ctx) => {
        const args = z.object({ crop: z.string(), district: z.string().optional() }).parse(rawArgs);
        const records = await marketBenchmarkService.getBenchmarks(args.district || 'Nashik');
        const match = records.find((r) => r.cropName.toLowerCase().includes(args.crop.toLowerCase())) || records[0];
        return {
          success: true,
          data: {
            crop: match?.cropName || args.crop,
            district: match?.district || args.district,
            modalPrice: match?.modalPrice || 2450,
            trendIndicator: match?.trend || 'STABLE',
            disclaimer: 'Price Trend Indicator shows historical slope, not statistical probability.',
          },
        };
      },
    });

    // 4. check_weather
    this.register({
      name: 'check_weather',
      description: 'Get weather observation and forecast for a district',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({
        district: z.string().optional(),
      }),
      execute: async (rawArgs, _ctx) => {
        const args = z.object({ district: z.string().optional() }).parse(rawArgs);
        const provider = getWeatherDataProvider();
        const dist = args.district || 'Nashik';
        const obs = await provider.getWeatherObservation(dist);
        const fc = await provider.getWeatherForecast(dist, 5);
        return { success: true, data: { observation: obs, forecast: fc } };
      },
    });

    // 5. find_storage
    this.register({
      name: 'find_storage',
      description: 'Discover nearby storage facilities',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({
        district: z.string().optional(),
        storageType: z.string().optional(),
      }),
      execute: async (rawArgs, _ctx) => {
        const args = z.object({ district: z.string().optional(), storageType: z.string().optional() }).parse(rawArgs);
        const facilities = await storageRepository.discoverStorageFacilities(args.district, args.storageType);
        return { success: true, data: facilities };
      },
    });

    // 6. find_transport
    this.register({
      name: 'find_transport',
      description: 'Discover available transport vehicles',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({
        district: z.string().optional(),
        vehicleType: z.string().optional(),
      }),
      execute: async (rawArgs, _ctx) => {
        const args = z.object({ district: z.string().optional(), vehicleType: z.string().optional() }).parse(rawArgs);
        const providers = await transportRepository.discoverTransportProviders(args.district, args.vehicleType);
        return { success: true, data: providers };
      },
    });

    // 7. view_my_listings
    this.register({
      name: 'view_my_listings',
      description: 'View authenticated farmer listings',
      readOnly: true,
      requiredRole: 'FARMER',
      confirmationRequired: false,
      inputSchema: z.object({}),
      execute: async (_rawArgs, ctx) => {
        const lots = await db.lot.findMany({
          where: { farmerId: ctx.userId },
          orderBy: { createdAt: 'desc' },
        });
        return { success: true, data: lots };
      },
    });

    // 8. view_offers
    this.register({
      name: 'view_offers',
      description: 'View active offers submitted or received',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({ lotId: z.string().optional() }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({ lotId: z.string().optional() }).parse(rawArgs);
        if (args.lotId) {
          const offers = await biddingRepository.findByLotId(args.lotId);
          return { success: true, data: offers };
        }
        const userOffers = await db.offerAndBid.findMany({
          where: { bidderId: ctx.userId },
          orderBy: { createdAt: 'desc' },
        });
        return { success: true, data: userOffers };
      },
    });

    // 9. view_orders
    this.register({
      name: 'view_orders',
      description: 'View user orders',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({ status: z.string().optional() }),
      execute: async (_rawArgs, ctx) => {
        const orders = ctx.role === 'FARMER'
          ? await orderRepository.findOrdersByFarmer(ctx.userId)
          : await orderRepository.findOrdersByBuyer(ctx.userId);
        return { success: true, data: orders };
      },
    });

    // 10. check_order_status
    this.register({
      name: 'check_order_status',
      description: 'Check specific order status and receipt details',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({ orderId: z.string() }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({ orderId: z.string() }).parse(rawArgs);
        const order = await orderRepository.findOrderById(args.orderId);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.buyerId !== ctx.userId && order.farmerId !== ctx.userId) {
          return { success: false, error: 'UNAUTHORIZED_ACCESS: Order does not belong to you' };
        }
        return { success: true, data: order };
      },
    });

    // 11. calculate_net_realization
    this.register({
      name: 'calculate_net_realization',
      description: 'Calculate net realization price per quintal after logistics and commission',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({
        modalPricePerUnit: z.number().positive(),
        quantity: z.number().positive(),
        distanceKm: z.number().nonnegative().optional(),
        storageDays: z.number().nonnegative().optional(),
      }),
      execute: async (rawArgs, _ctx) => {
        const args = z.object({
          modalPricePerUnit: z.number().positive(),
          quantity: z.number().positive(),
          distanceKm: z.number().nonnegative().optional(),
          storageDays: z.number().nonnegative().optional(),
        }).parse(rawArgs);

        const grossRevenue = args.modalPricePerUnit * args.quantity;
        const transportCost = (args.distanceKm || 20) * 15 * Math.ceil(args.quantity / 10);
        const storageCost = (args.storageDays || 0) * 5 * args.quantity;
        const apmcCommission = grossRevenue * 0.015;
        const netRealization = grossRevenue - transportCost - storageCost - apmcCommission;
        const netPerUnit = Math.round((netRealization / args.quantity) * 100) / 100;

        return {
          success: true,
          data: {
            grossRevenue,
            transportCost,
            storageCost,
            apmcCommission,
            netRealization,
            netPerUnit,
          },
        };
      },
    });

    // 12. find_nearby_buyers
    this.register({
      name: 'find_nearby_buyers',
      description: 'Discover active buyer crop requirements',
      readOnly: true,
      requiredRole: 'FARMER',
      confirmationRequired: false,
      inputSchema: z.object({ crop: z.string().optional(), district: z.string().optional() }),
      execute: async (_rawArgs, ctx) => {
        const reqs = await buyerRequirementService.getBuyerRequirements(ctx.userId);
        return { success: true, data: reqs };
      },
    });

    // 13. navigate_to
    this.register({
      name: 'navigate_to',
      description: 'Navigate to allowed target page route',
      readOnly: true,
      confirmationRequired: false,
      inputSchema: z.object({ path: z.string() }),
      execute: async (rawArgs, _ctx) => {
        const args = z.object({ path: z.string() }).parse(rawArgs);
        if (!RouteAllowlist.includes(args.path)) {
          return { success: false, error: 'FORBIDDEN_ROUTE: Path is not on the navigation allowlist' };
        }
        return { success: true, data: { navigateTo: args.path } };
      },
    });

    // ACTION PREPARATION TOOLS (Require Server-Bound Preview & User Confirmation)

    // 14. prepare_crop_listing
    this.register({
      name: 'prepare_crop_listing',
      description: 'Prepare produce lot listing preview for confirmation',
      readOnly: false,
      requiredRole: 'FARMER',
      requiredVerification: true,
      confirmationRequired: true,
      inputSchema: z.object({
        cropName: z.string(),
        variety: z.string().optional(),
        quantityAvailable: z.number().positive(),
        unit: z.string().default('Quintal'),
        askPricePerUnit: z.number().positive(),
        publicDistrict: z.string(),
        publicTaluka: z.string().optional(),
        publicVillage: z.string().optional(),
      }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({
          cropName: z.string(),
          variety: z.string().optional(),
          quantityAvailable: z.number().positive(),
          unit: z.string().default('Quintal'),
          askPricePerUnit: z.number().positive(),
          publicDistrict: z.string(),
          publicTaluka: z.string().optional(),
          publicVillage: z.string().optional(),
        }).parse(rawArgs);

        if (ctx.role !== 'FARMER') {
          return { success: false, error: 'UNAUTHORIZED_ROLE: Only farmers can publish produce listings.' };
        }

        const previewRecord = previewTokenStore.createPreviewToken(
          ctx.userId,
          'CREATE_CROP_LISTING',
          args,
          `crop:${args.cropName}_qty:${args.quantityAvailable}_price:${args.askPricePerUnit}`
        );

        return {
          success: true,
          previewId: previewRecord.previewId,
          previewPayload: {
            actionType: 'CREATE_CROP_LISTING',
            cropName: args.cropName,
            quantityAvailable: args.quantityAvailable,
            unit: args.unit,
            askPricePerUnit: args.askPricePerUnit,
            district: args.publicDistrict,
            totalValue: args.quantityAvailable * args.askPricePerUnit,
          },
        };
      },
    });

    // 15. prepare_accept_offer
    this.register({
      name: 'prepare_accept_offer',
      description: 'Prepare offer acceptance preview for confirmation',
      readOnly: false,
      requiredRole: 'FARMER',
      requiredVerification: true,
      confirmationRequired: true,
      inputSchema: z.object({ offerId: z.string() }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({ offerId: z.string() }).parse(rawArgs);
        const offer = await db.offerAndBid.findUnique({
          where: { id: args.offerId },
          include: { lot: true, bidder: true },
        });

        if (!offer) return { success: false, error: 'Offer not found' };
        if (offer.lot.farmerId !== ctx.userId) {
          return { success: false, error: 'UNAUTHORIZED: You do not own this produce lot.' };
        }
        if (offer.status !== 'PENDING') {
          return { success: false, error: `INVALID_STATE: Cannot accept offer in state ${offer.status}` };
        }

        const previewRecord = previewTokenStore.createPreviewToken(
          ctx.userId,
          'ACCEPT_OFFER',
          args,
          `offerId:${offer.id}_status:${offer.status}_price:${offer.offeredPricePerUnit}`
        );

        return {
          success: true,
          previewId: previewRecord.previewId,
          previewPayload: {
            actionType: 'ACCEPT_OFFER',
            offerId: offer.id,
            cropName: offer.lot.cropName,
            offeredQuantity: offer.quantity,
            offeredPricePerUnit: offer.offeredPricePerUnit,
            buyerName: offer.bidder.name || 'Buyer',
            totalValue: offer.quantity * offer.offeredPricePerUnit,
          },
        };
      },
    });

    // 16. prepare_reject_offer
    this.register({
      name: 'prepare_reject_offer',
      description: 'Prepare offer rejection preview',
      readOnly: false,
      requiredRole: 'FARMER',
      confirmationRequired: true,
      inputSchema: z.object({ offerId: z.string() }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({ offerId: z.string() }).parse(rawArgs);
        const offer = await db.offerAndBid.findUnique({
          where: { id: args.offerId },
          include: { lot: true },
        });
        if (!offer) return { success: false, error: 'Offer not found' };
        if (offer.lot.farmerId !== ctx.userId) {
          return { success: false, error: 'UNAUTHORIZED: You do not own this produce lot.' };
        }

        const previewRecord = previewTokenStore.createPreviewToken(
          ctx.userId,
          'REJECT_OFFER',
          args,
          `offerId:${offer.id}_status:${offer.status}`
        );

        return {
          success: true,
          previewId: previewRecord.previewId,
          previewPayload: {
            actionType: 'REJECT_OFFER',
            offerId: offer.id,
            cropName: offer.lot.cropName,
            offeredQuantity: offer.quantity,
            offeredPricePerUnit: offer.offeredPricePerUnit,
          },
        };
      },
    });

    // 17. prepare_counter_offer
    this.register({
      name: 'prepare_counter_offer',
      description: 'Prepare counter offer preview',
      readOnly: false,
      requiredRole: 'FARMER',
      confirmationRequired: true,
      inputSchema: z.object({
        parentOfferId: z.string(),
        counterPricePerUnit: z.number().positive(),
        counterQuantity: z.number().positive().optional(),
      }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({
          parentOfferId: z.string(),
          counterPricePerUnit: z.number().positive(),
          counterQuantity: z.number().positive().optional(),
        }).parse(rawArgs);

        const parent = await db.offerAndBid.findUnique({
          where: { id: args.parentOfferId },
          include: { lot: true },
        });
        if (!parent) return { success: false, error: 'Parent offer not found' };
        if (parent.lot.farmerId !== ctx.userId) {
          return { success: false, error: 'UNAUTHORIZED: You are not authorized to counter this offer.' };
        }

        const previewRecord = previewTokenStore.createPreviewToken(
          ctx.userId,
          'COUNTER_OFFER',
          args,
          `parentOfferId:${parent.id}_status:${parent.status}_counterPrice:${args.counterPricePerUnit}`
        );

        return {
          success: true,
          previewId: previewRecord.previewId,
          previewPayload: {
            actionType: 'COUNTER_OFFER',
            parentOfferId: parent.id,
            cropName: parent.lot.cropName,
            counterPricePerUnit: args.counterPricePerUnit,
            counterQuantity: args.counterQuantity || parent.quantity,
          },
        };
      },
    });

    // 18. prepare_order
    this.register({
      name: 'prepare_order',
      description: 'Prepare order generation preview from accepted offer',
      readOnly: false,
      requiredVerification: true,
      confirmationRequired: true,
      inputSchema: z.object({ acceptedOfferId: z.string() }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({ acceptedOfferId: z.string() }).parse(rawArgs);
        const offer = await db.offerAndBid.findUnique({
          where: { id: args.acceptedOfferId },
          include: { lot: true },
        });
        if (!offer) return { success: false, error: 'Accepted offer not found' };
        if (offer.status !== 'ACCEPTED') {
          return { success: false, error: 'INVALID_STATE: Order can only be generated for accepted offers.' };
        }

        const previewRecord = previewTokenStore.createPreviewToken(
          ctx.userId,
          'GENERATE_ORDER',
          args,
          `offerId:${offer.id}_status:${offer.status}`
        );

        return {
          success: true,
          previewId: previewRecord.previewId,
          previewPayload: {
            actionType: 'GENERATE_ORDER',
            acceptedOfferId: offer.id,
            cropName: offer.lot.cropName,
            agreedQuantity: offer.quantity,
            agreedPricePerUnit: offer.offeredPricePerUnit,
            totalValue: offer.quantity * offer.offeredPricePerUnit,
          },
        };
      },
    });

    // 19. prepare_transport_request
    this.register({
      name: 'prepare_transport_request',
      description: 'Prepare transport booking request preview',
      readOnly: false,
      requiredVerification: true,
      confirmationRequired: true,
      inputSchema: z.object({
        providerId: z.string(),
        pickupDistrict: z.string(),
        destinationDistrict: z.string(),
        cargoWeightQuintals: z.number().positive(),
      }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({
          providerId: z.string(),
          pickupDistrict: z.string(),
          destinationDistrict: z.string(),
          cargoWeightQuintals: z.number().positive(),
        }).parse(rawArgs);

        const previewRecord = previewTokenStore.createPreviewToken(
          ctx.userId,
          'REQUEST_TRANSPORT',
          args,
          `providerId:${args.providerId}_weight:${args.cargoWeightQuintals}`
        );

        return {
          success: true,
          previewId: previewRecord.previewId,
          previewPayload: {
            actionType: 'REQUEST_TRANSPORT',
            providerId: args.providerId,
            pickupDistrict: args.pickupDistrict,
            destinationDistrict: args.destinationDistrict,
            cargoWeightQuintals: args.cargoWeightQuintals,
          },
        };
      },
    });

    // 20. prepare_storage_reservation
    this.register({
      name: 'prepare_storage_reservation',
      description: 'Prepare storage reservation request preview',
      readOnly: false,
      requiredRole: 'FARMER',
      requiredVerification: true,
      confirmationRequired: true,
      inputSchema: z.object({
        facilityId: z.string(),
        reservedCapacityUnits: z.number().positive(),
        durationDays: z.number().positive(),
      }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({
          facilityId: z.string(),
          reservedCapacityUnits: z.number().positive(),
          durationDays: z.number().positive(),
        }).parse(rawArgs);

        const facility = await db.storageFacility.findUnique({
          where: { id: args.facilityId },
        });
        if (!facility) return { success: false, error: 'Storage facility not found' };

        const previewRecord = previewTokenStore.createPreviewToken(
          ctx.userId,
          'RESERVE_STORAGE',
          args,
          `facilityId:${facility.id}_capacity:${args.reservedCapacityUnits}`
        );

        return {
          success: true,
          previewId: previewRecord.previewId,
          previewPayload: {
            actionType: 'RESERVE_STORAGE',
            facilityId: facility.id,
            facilityName: facility.facilityName,
            reservedCapacityUnits: args.reservedCapacityUnits,
            durationDays: args.durationDays,
          },
        };
      },
    });

    // 21. prepare_report
    this.register({
      name: 'prepare_report',
      description: 'Prepare user safety report submission preview',
      readOnly: false,
      confirmationRequired: true,
      inputSchema: z.object({
        reportedUserId: z.string(),
        reason: z.string().min(5),
      }),
      execute: async (rawArgs, ctx) => {
        const args = z.object({
          reportedUserId: z.string(),
          reason: z.string().min(5),
        }).parse(rawArgs);

        const previewRecord = previewTokenStore.createPreviewToken(
          ctx.userId,
          'SUBMIT_REPORT',
          args,
          `reportedUserId:${args.reportedUserId}`
        );

        return {
          success: true,
          previewId: previewRecord.previewId,
          previewPayload: {
            actionType: 'SUBMIT_REPORT',
            reportedUserId: args.reportedUserId,
            reason: args.reason,
          },
        };
      },
    });
  }
}

export const toolRegistry = new ToolRegistry();
