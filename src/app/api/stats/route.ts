import { NextResponse } from 'next/server';
import { getDailyTransactionStats } from '@/lib/etherscan';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 10;
    
    const stats = await getDailyTransactionStats(days);
    
    return NextResponse.json({
      status: 'success',
      data: stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction statistics' },
      { status: 500 }
    );
  }
} 