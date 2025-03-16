import { NextResponse } from 'next/server';
import { getWalletBalance, getTransactionHistory } from '@/lib/etherscan';
import { saveWalletData, saveTransaction } from '@/lib/neo4j';
import { NOTIFICATION_MESSAGES } from '@/lib/notification-context';

// Define types for Etherscan API responses
interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
}

interface EnhancedTransaction extends EtherscanTransaction {
  valueInEth: number;
  formattedDate: string;
  direction: 'incoming' | 'outgoing';
  gasCostEth: number;
}

interface EtherscanResponse {
  status: string;
  message: string;
  result: any;
}

interface TransactionResponse extends EtherscanResponse {
  result: EtherscanTransaction[];
}

interface ProcessedTransactionResponse {
  status: string;
  message: string;
  result: EnhancedTransaction[];
}

interface BalanceResponse extends EtherscanResponse {
  result: string;
  balanceInEth?: number;
}

// Interface for standardized API responses
interface ApiResponse {
  status: 'success' | 'error';
  message: string;
  data?: any;
  error?: string;
}

// Function to validate Ethereum address
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // Validate the address parameter
    if (!address) {
      return NextResponse.json({
        status: 'error',
        message: 'Bad Request',
        error: NOTIFICATION_MESSAGES.INVALID_ADDRESS
      } as ApiResponse, { status: 400 });
    }
    
    if (!isValidEthereumAddress(address)) {
      return NextResponse.json({
        status: 'error',
        message: 'Bad Request',
        error: NOTIFICATION_MESSAGES.INVALID_ADDRESS
      } as ApiResponse, { status: 400 });
    }

    // Get wallet data from Etherscan
    let balance: EtherscanResponse, transactions: TransactionResponse;
    try {
      [balance, transactions] = await Promise.all([
        getWalletBalance(address),
        getTransactionHistory(address, page, pageSize)
      ]);
    } catch (etherscanError) {
      console.error('Etherscan API error:', etherscanError);
      return NextResponse.json(
        { error: 'Failed to fetch data from Etherscan API' },
        { status: 503 }
      );
    }

    // Process transaction data to include more details
    let processedTransactions: ProcessedTransactionResponse = { 
      status: '0', 
      message: 'No transaction data available', 
      result: [] 
    };
    
    if (transactions && transactions.status === '1' && transactions.result) {
      // Sort transactions by timestamp (newest first)
      const sortedTransactions = [...transactions.result].sort((a, b) => 
        parseInt(b.timeStamp) - parseInt(a.timeStamp)
      );
      
      // Add additional calculated fields
      const enhancedTransactions = sortedTransactions.map(tx => {
        // Convert wei to ETH with proper formatting
        const valueInEth = parseFloat((parseInt(tx.value) / 1e18).toFixed(6));
        
        // Format date
        const date = new Date(parseInt(tx.timeStamp) * 1000);
        const formattedDate = date.toLocaleString();
        
        // Determine if transaction is incoming or outgoing relative to the requested address
        const direction = tx.from.toLowerCase() === address.toLowerCase() ? 'outgoing' : 'incoming' as 'outgoing' | 'incoming';
        
        // Calculate gas cost in ETH
        const gasPrice = parseInt(tx.gasPrice);
        const gasUsed = parseInt(tx.gasUsed);
        const gasCostWei = gasPrice * gasUsed;
        const gasCostEth = parseFloat((gasCostWei / 1e18).toFixed(6));
        
        return {
          ...tx,
          valueInEth,
          formattedDate,
          direction,
          gasCostEth
        };
      });
      
      processedTransactions = {
        status: '1',
        message: 'OK',
        result: enhancedTransactions
      };
    }

    // Process balance data
    let processedBalance: BalanceResponse = { 
      status: '0', 
      message: 'No balance data available', 
      result: '0' 
    };
    
    if (balance && balance.status === '1') {
      const balanceInWei = balance.result;
      const balanceInEth = parseFloat((parseInt(balanceInWei) / 1e18).toFixed(6));
      
      processedBalance = {
        status: '1',
        message: 'OK',
        result: balanceInWei,
        balanceInEth
      };
    }

    // Calculate transaction statistics
    const stats = {
      totalTransactions: 0,
      incomingCount: 0,
      outgoingCount: 0,
      totalReceived: 0,
      totalSent: 0,
      totalGasCost: 0
    };

    if (processedTransactions.status === '1' && processedTransactions.result.length > 0) {
      const txs = processedTransactions.result;
      stats.totalTransactions = txs.length;
      
      txs.forEach(tx => {
        if (tx.direction === 'incoming') {
          stats.incomingCount++;
          stats.totalReceived += tx.valueInEth;
        } else {
          stats.outgoingCount++;
          stats.totalSent += tx.valueInEth;
          stats.totalGasCost += tx.gasCostEth;
        }
      });
    }

    // Format transactions for the graph visualization
    const graphTransactions = processedTransactions.result.map(tx => {
      // Ensure we have valid source and target addresses
      const source = tx.from || '0x0000000000000000000000000000000000000000';
      const target = tx.to || '0x0000000000000000000000000000000000000000';
      
      // Skip transactions where source and target are the same (unlikely but possible)
      if (source.toLowerCase() === target.toLowerCase()) {
        return null;
      }
      
      return {
        source,
        target,
        amount: tx.valueInEth || 0.0001, // Ensure non-zero amount for visibility
        date: tx.formattedDate,
        transactionId: tx.hash,
        direction: tx.direction,
        gasCost: tx.gasCostEth || 0
      };
    }).filter(Boolean); // Remove any null entries

    // Create a simplified graph with direct connections to the focus address
    // This ensures we always have valid connections for visualization
    interface GraphTransaction {
      source: string;
      target: string;
      amount: number;
      date: string;
      transactionId: string;
      direction: 'incoming' | 'outgoing';
      gasCost: number;
    }
    
    const simplifiedGraphTransactions: GraphTransaction[] = [];
    
    // Get unique addresses that have interacted with the focus address
    const uniqueAddresses = new Set<string>();
    processedTransactions.result.forEach(tx => {
      // Ensure we have valid addresses before adding them
      if (tx.from && tx.from.toLowerCase() !== address.toLowerCase()) {
        uniqueAddresses.add(tx.from);
      }
      if (tx.to && tx.to.toLowerCase() !== address.toLowerCase()) {
        uniqueAddresses.add(tx.to);
      }
    });
    
    console.log(`Found ${uniqueAddresses.size} unique addresses interacting with ${address}`);
    
    // Create direct connections between the focus address and each unique address
    uniqueAddresses.forEach(connectedAddress => {
      // Find all transactions between these addresses
      const incomingTxs = processedTransactions.result.filter(
        tx => tx.from.toLowerCase() === connectedAddress.toLowerCase() && 
             tx.to.toLowerCase() === address.toLowerCase()
      );
      
      const outgoingTxs = processedTransactions.result.filter(
        tx => tx.from.toLowerCase() === address.toLowerCase() && 
             tx.to.toLowerCase() === connectedAddress.toLowerCase()
      );
      
      // Add incoming transaction if any
      if (incomingTxs.length > 0) {
        // Sum up all incoming transaction values
        const totalAmount = incomingTxs.reduce((sum, tx) => sum + tx.valueInEth, 0);
        
        simplifiedGraphTransactions.push({
          source: connectedAddress,
          target: address,
          amount: totalAmount,
          date: incomingTxs[0].formattedDate, // Use the date of the first transaction
          transactionId: incomingTxs[0].hash, // Use the hash of the first transaction
          direction: 'incoming',
          gasCost: 0
        });
      }
      
      // Add outgoing transaction if any
      if (outgoingTxs.length > 0) {
        // Sum up all outgoing transaction values
        const totalAmount = outgoingTxs.reduce((sum, tx) => sum + tx.valueInEth, 0);
        
        simplifiedGraphTransactions.push({
          source: address,
          target: connectedAddress,
          amount: totalAmount,
          date: outgoingTxs[0].formattedDate, // Use the date of the first transaction
          transactionId: outgoingTxs[0].hash, // Use the hash of the first transaction
          direction: 'outgoing',
          gasCost: 0
        });
      }
    });

    console.log(`Created ${simplifiedGraphTransactions.length} simplified graph transactions`);

    // If we don't have any simplified transactions but have regular transactions,
    // create at least one connection to show something in the graph
    if (simplifiedGraphTransactions.length === 0 && graphTransactions.length > 0) {
      console.log("No simplified transactions created, using first regular transaction");
      
      // Use the first transaction to create a direct connection
      const firstTx = graphTransactions[0];
      
      if (firstTx && firstTx.source !== firstTx.target) {
        simplifiedGraphTransactions.push({
          source: firstTx.source === address ? firstTx.source : address,
          target: firstTx.target === address ? firstTx.target : address,
          amount: firstTx.amount || 0.0001, // Ensure non-zero amount
          date: firstTx.date || new Date().toISOString(),
          transactionId: firstTx.transactionId || 'unknown',
          direction: firstTx.direction || 'outgoing',
          gasCost: firstTx.gasCost || 0
        });
      }
    }

    // Prepare response data
    const responseData = {
      address,
      balance: processedBalance,
      transactions: processedTransactions,
      graphTransactions: simplifiedGraphTransactions.length > 0 ? simplifiedGraphTransactions : graphTransactions,
      stats,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in wallet API:', error);
    
    let errorMessage = NOTIFICATION_MESSAGES.DATA_FETCH_ERROR;
    
    // Provide more specific error messages based on error type
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('rate limit') || message.includes('too many requests')) {
        errorMessage = NOTIFICATION_MESSAGES.API_RATE_LIMIT;
      } else if (message.includes('connection') || message.includes('network') || message.includes('timeout')) {
        errorMessage = NOTIFICATION_MESSAGES.CONNECTION_ERROR;
      } else if (message.includes('not found') || message.includes('no transactions')) {
        errorMessage = NOTIFICATION_MESSAGES.WALLET_NOT_FOUND;
      } else if (message.includes('server error')) {
        errorMessage = NOTIFICATION_MESSAGES.SERVER_ERROR;
      }
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Internal Server Error',
      error: errorMessage
    } as ApiResponse, { status: 500 });
  }
} 