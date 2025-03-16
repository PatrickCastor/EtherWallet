import neo4j, { Session, ManagedTransaction } from 'neo4j-driver';

if (!process.env.NEO4J_URI || !process.env.NEO4J_USERNAME || !process.env.NEO4J_PASSWORD) {
  throw new Error('Neo4j credentials are not properly configured in environment variables');
}

// Create a single driver instance that is shared across the application
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
  {
    // Add connection pooling configuration
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 30000,
    disableLosslessIntegers: true // Convert Neo4j integers to JavaScript numbers
  }
);

// Track sessions to ensure proper cleanup
const activeSessions = new Set<Session>();

// Ensure driver is closed when the application shuts down
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing Neo4j driver');
  await closeNeo4jConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing Neo4j driver');
  await closeNeo4jConnection();
  process.exit(0);
});

export async function getNeo4jSession() {
  const session = driver.session();
  activeSessions.add(session);
  return session;
}

export async function closeNeo4jConnection() {
  // Close all active sessions first
  for (const session of activeSessions) {
    try {
      await session.close();
    } catch (e) {
      console.error('Error closing Neo4j session:', e);
    }
  }
  activeSessions.clear();
  
  // Then close the driver
  try {
    await driver.close();
    console.log('Neo4j driver closed successfully');
  } catch (e) {
    console.error('Error closing Neo4j driver:', e);
  }
}

export async function queryNeo4j(query: string, params: any = {}) {
  const session = await getNeo4jSession();
  try {
    const result = await session.run(query, params);
    return result.records;
  } finally {
    await session.close();
    activeSessions.delete(session);
  }
}

// Execute queries within a transaction for better performance when doing multiple operations
export async function executeTransaction<T>(
  transactionWork: (tx: ManagedTransaction) => Promise<T>
): Promise<T> {
  const session = await getNeo4jSession();
  try {
    return await session.executeWrite(transactionWork);
  } finally {
    await session.close();
    activeSessions.delete(session);
  }
}

export async function getWalletData(address: string) {
  try {
    const records = await queryNeo4j(
      'MATCH (w:Wallet {address: $address}) RETURN w',
      { address }
    );
    
    if (records.length === 0) {
      return null;
    }
    
    return records[0].get('w').properties;
  } catch (error) {
    console.error('Error fetching wallet data from Neo4j:', error);
    return null;
  }
}

export async function saveWalletData(address: string, balance: string) {
  try {
    await queryNeo4j(
      `
      MERGE (w:Wallet {address: $address})
      ON CREATE SET w.firstSeen = datetime(), w.balance = $balance
      ON MATCH SET w.lastSeen = datetime(), w.balance = $balance
      `,
      { address, balance }
    );
    return true;
  } catch (error) {
    console.error('Error saving wallet data to Neo4j:', error);
    return false;
  }
}

export async function saveTransaction(transaction: {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
}) {
  try {
    await queryNeo4j(
      `
      MATCH (from:Wallet {address: $fromAddress})
      MATCH (to:Wallet {address: $toAddress})
      MERGE (from)-[t:TRANSFERRED {hash: $hash}]->(to)
      ON CREATE SET 
        t.value = $value,
        t.timestamp = datetime({epochSeconds: toInteger($timeStamp)}),
        t.created = datetime()
      `,
      { 
        hash: transaction.hash,
        fromAddress: transaction.from,
        toAddress: transaction.to,
        value: transaction.value,
        timeStamp: transaction.timeStamp
      }
    );
    return true;
  } catch (error) {
    console.error('Error saving transaction to Neo4j:', error);
    return false;
  }
} 