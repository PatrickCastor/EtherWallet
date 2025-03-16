import { NextResponse } from 'next/server';
import { getHistoricalPriceData, generateFallbackPriceData, PriceData } from '@/lib/priceApi';

// Simple in-memory cache
interface CacheItem {
  data: PriceData[];
  timestamp: number;
  days: number | string;
}

const cache: Map<string, CacheItem> = new Map();
// Default cache TTL is 5 minutes
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; 
// For 'max' (ALL) time range, use a shorter TTL to ensure fresher data
const MAX_RANGE_CACHE_TTL = 1 * 60 * 1000; // 1 minute for 'max' range

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    
    // Default to 30 days if not specified
    const days = daysParam || '30';
    
    // Use the days parameter as a string key for the cache
    const cacheKey = days;
    
    // Check if we have cached data for this time range
    const cachedData = cache.get(cacheKey);
    const now = Date.now();
    
    // Determine which TTL to use based on the time range
    const CACHE_TTL = days === 'max' ? MAX_RANGE_CACHE_TTL : DEFAULT_CACHE_TTL;
    
    if (cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
      console.log(`Using cached price data for ${days === 'max' ? 'ALL time' : days + ' days'}`);
      return NextResponse.json({
        status: 'success',
        data: cachedData.data,
        lastUpdated: new Date(cachedData.timestamp).toISOString(),
        source: 'cache'
      });
    }
    
    // Fetch fresh data from Binance API
    let priceData: PriceData[];
    try {
      // If days is 'max', we want to get the complete history
      if (days === 'max') {
        // Ethereum was first listed on exchanges around August 2015
        // Calculate days since then to get complete history
        const ethereumLaunchDate = new Date('2015-08-07');
        const daysSinceEthereumLaunch = Math.ceil(
          (now - ethereumLaunchDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        priceData = await getHistoricalPriceData(daysSinceEthereumLaunch);
      } else {
        priceData = await getHistoricalPriceData(parseFloat(days));
      }
      
      // Cache the data
      cache.set(cacheKey, {
        data: priceData,
        timestamp: now,
        days
      });
      
      // Clean up old cache entries
      for (const [key, value] of cache.entries()) {
        const ttlToUse = key === 'max' ? MAX_RANGE_CACHE_TTL : DEFAULT_CACHE_TTL;
        if (now - value.timestamp > ttlToUse) {
          cache.delete(key);
        }
      }
      
      return NextResponse.json({
        status: 'success',
        data: priceData,
        lastUpdated: new Date().toISOString(),
        source: 'binance'
      });
    } catch (error) {
      console.error('Error fetching price data from Binance:', error);
      
      // Use fallback data if API fails
      if (days === 'max') {
        // Generate a reasonable amount of fallback data for "ALL" view
        priceData = generateFallbackPriceData(365 * 2); // 2 years of data as fallback
      } else {
        priceData = generateFallbackPriceData(parseFloat(days));
      }
      
      return NextResponse.json({
        status: 'success',
        data: priceData,
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      });
    }
  } catch (error) {
    console.error('Error in price API route:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Failed to fetch price data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 