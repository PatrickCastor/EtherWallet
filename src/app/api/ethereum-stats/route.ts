import { NextResponse } from 'next/server';
import { getEthereumStats } from '@/lib/etherscan';

// Simple in-memory cache
interface CacheItem {
  data: any;
  timestamp: number;
}

const cache: Map<string, CacheItem> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const cacheKey = 'ethereum-stats';
    const now = Date.now();
    
    // Check if we have cached data
    const cachedData = cache.get(cacheKey);
    if (cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        ...cachedData.data,
        source: 'cache',
        lastUpdated: new Date(cachedData.timestamp).toISOString()
      });
    }
    
    // Fetch fresh data
    const stats = await getEthereumStats();
    
    // Cache the data
    cache.set(cacheKey, {
      data: stats,
      timestamp: now
    });
    
    return NextResponse.json({
      ...stats,
      source: 'api',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Ethereum stats:', error);
    
    // Return fallback data
    return NextResponse.json({
      marketCap: 231580000000,
      totalTransactions: 2500000000,
      totalBlocks: 18500000,
      circulatingSupply: 120000000,
      totalSupply: 120000000,
      ethPrice: 1900,
      source: 'fallback',
      lastUpdated: new Date().toISOString()
    });
  }
} 