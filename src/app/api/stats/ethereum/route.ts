import { NextResponse } from 'next/server';
import { getEthereumStats } from '@/lib/etherscan';

export async function GET() {
  try {
    const stats = await getEthereumStats();
    
    // Format the stats for display
    const formattedStats = {
      totalBlocks: stats.totalBlocks.toLocaleString(),
      totalTransactions: formatLargeNumber(stats.totalTransactions),
      marketCap: `$${formatLargeNumber(stats.marketCap)}`,
      ethPrice: `$${parseFloat(stats.ethPrice.toString()).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    };
    
    return NextResponse.json({
      status: 'success',
      data: formattedStats,
      rawData: stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in Ethereum stats API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Ethereum statistics' },
      { status: 500 }
    );
  }
}

// Helper function to format large numbers (e.g., 1,234,567 -> 1.23M)
function formatLargeNumber(num: number): string {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  } else {
    return num.toLocaleString();
  }
} 