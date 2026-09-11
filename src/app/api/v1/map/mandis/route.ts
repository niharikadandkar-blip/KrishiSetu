import { NextResponse } from 'next/server';
import { MandiLocationItem } from '@/lib/types/phase7';

// Static/Demo APMC Mandi Benchmark Data with Maharashtra Coordinates
const DEMO_MANDI_BENCHMARKS: MandiLocationItem[] = [
  {
    id: 'mandi_vashi',
    mandiName: 'Vashi APMC Market',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    cropName: 'Onion',
    modalPrice: 2450,
    minPrice: 2100,
    maxPrice: 2800,
    location: { latitude: 19.076, longitude: 73.0033 },
    isStaticDemo: true,
  },
  {
    id: 'mandi_nashik',
    mandiName: 'Lasalgaon APMC (Nashik)',
    district: 'Nashik',
    state: 'Maharashtra',
    cropName: 'Onion',
    modalPrice: 2200,
    minPrice: 1900,
    maxPrice: 2500,
    location: { latitude: 20.1491, longitude: 74.2285 },
    isStaticDemo: true,
  },
  {
    id: 'mandi_pune',
    mandiName: 'Gultekdi APMC Market (Pune)',
    district: 'Pune',
    state: 'Maharashtra',
    cropName: 'Tomato',
    modalPrice: 1800,
    minPrice: 1500,
    maxPrice: 2100,
    location: { latitude: 18.4975, longitude: 73.8642 },
    isStaticDemo: true,
  },
  {
    id: 'mandi_sangli',
    mandiName: 'Sangli APMC Market',
    district: 'Sangli',
    state: 'Maharashtra',
    cropName: 'Turmeric',
    modalPrice: 14500,
    minPrice: 13000,
    maxPrice: 16200,
    location: { latitude: 16.8524, longitude: 74.5815 },
    isStaticDemo: true,
  },
  {
    id: 'mandi_nagpur',
    mandiName: 'Kalamna APMC Market (Nagpur)',
    district: 'Nagpur',
    state: 'Maharashtra',
    cropName: 'Orange',
    modalPrice: 3800,
    minPrice: 3200,
    maxPrice: 4500,
    location: { latitude: 21.1712, longitude: 79.1234 },
    isStaticDemo: true,
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    isStaticDemoData: true,
    disclaimer: 'Static APMC Mandi benchmark data for market intelligence discovery.',
    mandis: DEMO_MANDI_BENCHMARKS,
  });
}
