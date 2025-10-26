#!/usr/bin/env tsx
/**
 * Get Token IDs from Market/Condition ID
 * 
 * Converts a market condition ID (hex format) to token IDs
 * 
 * Usage:
 *   tsx scripts/get-market-tokens.ts <condition_id>
 */

const POLYMARKET_API = 'https://clob.polymarket.com';

interface TokenInfo {
    token_id: string;
    outcome: string;
    price?: string;
    winner?: boolean;
}

interface MarketData {
    condition_id: string;
    question?: string;
    description?: string;
    tokens?: TokenInfo[];
    outcomes?: string[];
    outcomePrices?: string[];
    active?: boolean;
    closed?: boolean;
    end_date_iso?: string;
}

/**
 * Fetch market data by condition ID
 */
async function getMarketByConditionId(conditionId: string): Promise<MarketData | null> {
    try {
        // Try different API endpoints
        const endpoints = [
            `/markets/${conditionId}`,
            `/markets?condition_id=${conditionId}`,
            `/book?condition_id=${conditionId}`,
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Trying: ${POLYMARKET_API}${endpoint}`);
                
                const response = await fetch(`${POLYMARKET_API}${endpoint}`, {
                    headers: {
                        'Accept': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Got response!');
                    
                    // Handle different response formats
                    if (Array.isArray(data)) {
                        return data[0] || null;
                    } else if (data.data) {
                        return data.data;
                    } else {
                        return data;
                    }
                }
            } catch (e) {
                // Try next endpoint
                continue;
            }
        }

        return null;
    } catch (error) {
        console.error('Error fetching market:', error);
        return null;
    }
}

/**
 * Display market info
 */
function displayMarketInfo(data: MarketData): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Market Information');
    console.log('='.repeat(80));
    
    if (data.question) {
        console.log(`\nQuestion: ${data.question}`);
    }
    
    if (data.description) {
        console.log(`Description: ${data.description}`);
    }
    
    console.log(`\nCondition ID: ${data.condition_id}`);
    console.log(`Active: ${data.active ? '✅ Yes' : '❌ No'}`);
    console.log(`Closed: ${data.closed ? '⚠️  Yes' : '✅ No'}`);
    
    if (data.end_date_iso) {
        console.log(`End Date: ${data.end_date_iso}`);
    }

    if (data.tokens && data.tokens.length > 0) {
        console.log('\n🎯 Token IDs (USE THESE IN strategies.json):');
        console.log('='.repeat(80));
        
        data.tokens.forEach(token => {
            console.log(`\n${token.outcome} Token:`);
            console.log(`  Token ID: ${token.token_id}`);
            if (token.price) {
                console.log(`  Price: ${(parseFloat(token.price) * 100).toFixed(2)}%`);
            }
            if (token.winner !== undefined) {
                console.log(`  Winner: ${token.winner ? '🏆 Yes' : 'No'}`);
            }
        });

        // Generate strategies.json snippet
        console.log('\n📝 strategies.json snippet:');
        console.log('='.repeat(80));
        console.log(JSON.stringify({
            id: 1,
            name: data.question || 'Market Strategy',
            conditionId: data.condition_id,
            polymarketOrders: data.tokens.map((token, i) => ({
                marketId: token.token_id,
                outcome: token.outcome,
                priority: i + 1,
                notionalBps: data.tokens.length > 1 ? Math.floor(10000 / data.tokens.length) : 10000,
                maxPriceBps: 7500,
            })),
        }, null, 2));
    } else if (data.outcomes) {
        console.log('\n⚠️  Market has outcomes but no token IDs in response');
        console.log('Outcomes:', data.outcomes.join(', '));
        if (data.outcomePrices) {
            console.log('Prices:', data.outcomePrices.join(', '));
        }
    } else {
        console.log('\n⚠️  No token information found in response');
        console.log('\nRaw data:');
        console.log(JSON.stringify(data, null, 2).substring(0, 1000));
    }
}

/**
 * Main function
 */
async function main() {
    const conditionId = process.argv[2];

    console.log('🔐 Polymarket Token ID Finder');
    console.log('============================\n');

    if (!conditionId) {
        console.log('Usage: tsx scripts/get-market-tokens.ts <condition_id>');
        console.log('\nExamples:');
        console.log('  tsx scripts/get-market-tokens.ts 0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb');
        console.log('\n💡 The condition_id is the hex string you found in the network tab.');
        process.exit(1);
    }

    console.log(`Condition ID: ${conditionId}\n`);

    const data = await getMarketByConditionId(conditionId);

    if (!data) {
        console.error('❌ Could not fetch market data');
        console.log('\n💡 The API endpoints may require authentication or the market may not be accessible.');
        console.log('   Try looking in the Network tab for calls to:');
        console.log('   - /book?token_id=...');
        console.log('   - /order-book');
        console.log('   - /price-history');
        console.log('\n   These might contain the token_id in the URL or response.');
        process.exit(1);
    }

    displayMarketInfo(data);
}

// Run if called directly
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

