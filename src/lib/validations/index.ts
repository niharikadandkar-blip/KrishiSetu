import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  mobile: z.string().regex(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' }),
  role: z.enum(['FARMER', 'BUYER']),
  language: z.enum(['mr', 'hi', 'en']),
});

export const otpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(6, { message: 'OTP must be exactly 6 digits' }),
});

export const locationSchema = z.object({
  state: z.string().min(1, { message: 'State is required' }),
  district: z.string().min(1, { message: 'District is required' }),
  taluka: z.string().optional(),
  village: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  formattedAddress: z.string().optional(),
});

export const farmerProfileSchema = z.object({
  mainCrop: z.string().optional(),
  otherCrops: z.string().optional(),
  farmingStatus: z.string().optional(),
  farmArea: z.number().positive().optional(),
});

export const buyerProfileSchema = z.object({
  businessName: z.string().optional(),
  businessType: z.enum(['TRADER', 'WHOLESALER', 'PROCESSOR', 'RETAILER', 'FPO', 'EXPORTER', 'OTHER']).optional(),
  cropsPurchased: z.string().optional(),
  businessLocation: z.string().optional(),
});
