import { NextResponse } from 'next/server';
import { getLatestBlocks } from '@/lib/etherscan';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get('count');
    const count = countParam ? parseInt(countParam) : 5;
    
    const blocks = await getLatestBlocks(count);
    
    // Format the blocks for display
    const formattedBlocks = blocks.map(block => {
      const timeAgo = getTimeAgo(block.timestamp);
      return {
        number: block.number,
        time: timeAgo,
        transactions: block.transactions,
        hash: block.hash,
        gasUsed: block.gasUsed,
        gasLimit: block.gasLimit,
        status: block.status,
        size: block.size
      };
    });
    
    return NextResponse.json({
      status: 'success',
      data: formattedBlocks,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in blocks API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest blocks' },
      { status: 500 }
    );
  }
}

// Helper function to format timestamp as "X time ago"
function getTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const secondsAgo = now - timestamp;
  
  if (secondsAgo < 60) {
    return `${secondsAgo} secs ago`;
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(secondsAgo / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
} 