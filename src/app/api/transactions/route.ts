import { NextResponse } from 'next/server';
import { getLatestTransactions } from '@/lib/etherscan';

// Define transaction interface
interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: number | string;  // Updated to allow string values
  timestamp: number;
  blockNumber: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get('count');
    const count = countParam ? parseInt(countParam) : 5;
    
    const transactions = await getLatestTransactions(count);
    
    // Check if transactions is an array
    if (!Array.isArray(transactions)) {
      console.warn('Transactions is not an array, using empty array');
      return NextResponse.json({
        status: 'success',
        data: [],
        lastUpdated: new Date().toISOString()
      });
    }
    
    // Format the transactions for display
    const formattedTransactions = transactions.map((tx: Transaction) => {
      const timeAgo = getTimeAgo(tx.timestamp);
      
      // Determine transaction type based on 'to' field and value
      let type = 'Coin transfer';
      if (!tx.to) {
        type = 'Contract creation';
      } else if (tx.value === 0) {
        type = 'Contract call';
      }
      
      // Format the amount with proper precision
      let formattedAmount;
      if (typeof tx.value === 'string' && tx.value.includes('e')) {
        // Handle scientific notation
        formattedAmount = tx.value + ' ETH';
      } else if (tx.value === 0) {
        formattedAmount = '0.000000 ETH';
      } else {
        // Format with 6 decimal places
        formattedAmount = `${Number(tx.value).toFixed(6)} ETH`;
      }
      
      return {
        hash: tx.hash,
        time: timeAgo,
        amount: formattedAmount,
        type: type,
        from: tx.from,
        to: tx.to || 'Contract Creation'
      };
    });
    
    return NextResponse.json({
      status: 'success',
      data: formattedTransactions,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in transactions API:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to fetch latest transactions' 
      },
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