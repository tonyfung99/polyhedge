#!/usr/bin/env tsx
/**
 * Fetch Active Polymarket Markets
 * 
 * This script fetches active crypto price prediction markets from Polymarket
 * and updates strategies.json with real market IDs.
 * 
 * Based on: packages/python/scanner/bridge_polymarket_client.py
 * 
 * Usage:
 *   tsx scripts/fetch-polymarket-markets.ts [--asset BTC|ETH|SOL] [--output strategies.json]
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const POLYMARKET_API = 'https://clob.polymarket.com';

interface PolymarketMarket {
    id: string;
    condition_id: string;
    question: string;
    description?: string;
    tokens?: Array<{
        token_id: string;
        outcome: string;
        price?: string;
    }>;
    end_date_iso?: string;
    game_start_time?: string;
    active: boolean;
    closed: boolean;
    archived: boolean;
    accepting_orders?: boolean;
    market_slug?: string;
}

interface ParsedMarket {
    marketId: string;
    conditionId: string;
    question: string;
    targetPrice: number;
    yesTokenId: string;
    noTokenId: string;
    yesPrice: number;
    noPrice: number;
    endDate: string;
    active: boolean;
    marketSlug?: string;
}

/**
 * Fetch active markets from Polymarket
 */
async function fetchActiveMarkets(asset: string = 'BTC'): Promise<PolymarketMarket[]> {
    try {
        console.log(`\n🔍 Fetching ${asset} price markets from Polymarket...`);
        
        // Query for active markets
        // Note: Polymarket API endpoints may vary, adjust as needed
        const url = `${POLYMARKET_API}/markets`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle different response formats
        let markets: PolymarketMarket[] = [];
        if (Array.isArray(data)) {
            markets = data;
        } else if (data.data && Array.isArray(data.data)) {
            markets = data.data;
        } else if (data.markets && Array.isArray(data.markets)) {
            markets = data.markets;
        } else {
            console.log('Response structure:', JSON.stringify(data).substring(0, 500));
            throw new Error('Unexpected API response format');
        }
        
        // Filter for crypto price markets
        const priceMarkets = markets.filter(market => {
            const question = market.question.toLowerCase();
            return (
                question.includes(asset.toLowerCase()) &&
                (question.includes('price') || question.includes('$') || question.includes('above') || question.includes('below')) &&
                market.active &&
                !market.closed &&
                !market.archived
            );
        });

        console.log(`✅ Found ${priceMarkets.length} active ${asset} price markets`);
        return priceMarkets;
    } catch (error) {
        console.error(`❌ Error fetching markets:`, error);
        return [];
    }
}

/**
 * Parse market question to extract target price
 */
function extractTargetPrice(question: string): number | null {
    // Match patterns like:
    // "$110,000", "$110k", "110K", "110000"
    const patterns = [
        /\$?([\d,]+)k/i,           // 110k, $110k
        /\$?([\d,]+),000/,         // $110,000
        /\$?([\d,]{5,})/,          // 110000
    ];

    for (const pattern of patterns) {
        const match = question.match(pattern);
        if (match) {
            let price = match[1].replace(/,/g, '');
            if (question.toLowerCase().includes('k')) {
                price = price + '000';
            }
            return parseFloat(price);
        }
    }

    return null;
}

/**
 * Parse market data into structured format
 */
function parseMarket(market: PolymarketMarket, asset: string): ParsedMarket | null {
    try {
        const targetPrice = extractTargetPrice(market.question);
        if (!targetPrice) {
            return null;
        }

        // Get token IDs for YES and NO outcomes
        const yesToken = market.tokens?.find(t => t.outcome.toLowerCase() === 'yes');
        const noToken = market.tokens?.find(t => t.outcome.toLowerCase() === 'no');

        if (!yesToken || !noToken) {
            console.warn(`⚠️  Market missing YES/NO tokens: ${market.question}`);
            return null;
        }

        return {
            marketId: market.id,
            conditionId: market.condition_id,
            question: market.question,
            targetPrice,
            yesTokenId: yesToken.token_id,
            noTokenId: noToken.token_id,
            yesPrice: parseFloat(yesToken.price || '0.5'),
            noPrice: parseFloat(noToken.price || '0.5'),
            endDate: market.end_date_iso || market.game_start_time || '',
            active: market.active,
            marketSlug: market.market_slug,
        };
    } catch (error) {
        console.error(`Error parsing market:`, error);
        return null;
    }
}

/**
 * Display market info
 */
function displayMarket(market: ParsedMarket, index: number): void {
    console.log(`\n${index + 1}. ${market.question}`);
    console.log(`   Target Price: $${market.targetPrice.toLocaleString()}`);
    console.log(`   YES Token: ${market.yesTokenId} (Price: ${(market.yesPrice * 100).toFixed(1)}%)`);
    console.log(`   NO Token:  ${market.noTokenId} (Price: ${(market.noPrice * 100).toFixed(1)}%)`);
    console.log(`   End Date: ${market.endDate}`);
    console.log(`   Market Slug: ${market.marketSlug || 'N/A'}`);
}

/**
 * Generate strategies.json content
 */
function generateStrategiesJson(markets: ParsedMarket[]): any {
    const strategies = [];

    // Strategy 1: BTC 110k YES + 150k NO (if both available)
    const btc110k = markets.find(m => m.targetPrice === 110000);
    const btc150k = markets.find(m => m.targetPrice === 150000);
    
    if (btc110k && btc150k) {
        strategies.push({
            id: 1,
            name: `BTC Price Hedge - ${btc110k.targetPrice / 1000}k vs ${btc150k.targetPrice / 1000}k`,
            polymarketOrders: [
                {
                    marketId: btc110k.yesTokenId,
                    outcome: 'YES',
                    priority: 1,
                    notionalBps: 5000,
                    maxPriceBps: 7500,
                },
                {
                    marketId: btc150k.noTokenId,
                    outcome: 'NO',
                    priority: 2,
                    notionalBps: 5000,
                    maxPriceBps: 6000,
                },
            ],
        });
    } else if (btc110k) {
        // Fallback: Just BTC 110k
        strategies.push({
            id: 1,
            name: `BTC ${btc110k.targetPrice / 1000}k Target`,
            polymarketOrders: [
                {
                    marketId: btc110k.yesTokenId,
                    outcome: 'YES',
                    priority: 1,
                    notionalBps: 10000,
                    maxPriceBps: 7500,
                },
            ],
        });
    }

    // Strategy 2: Another BTC level or ETH
    const btc120k = markets.find(m => m.targetPrice === 120000);
    if (btc120k) {
        strategies.push({
            id: 2,
            name: `BTC ${btc120k.targetPrice / 1000}k Strategy`,
            polymarketOrders: [
                {
                    marketId: btc120k.yesTokenId,
                    outcome: 'YES',
                    priority: 1,
                    notionalBps: 10000,
                    maxPriceBps: 8000,
                },
            ],
        });
    }

    return { strategies };
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const assetIndex = args.indexOf('--asset');
    const outputIndex = args.indexOf('--output');
    
    const asset = assetIndex !== -1 ? args[assetIndex + 1] : 'BTC';
    const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : 'strategies.json';

    console.log('🚀 Polymarket Market Fetcher');
    console.log('============================');

    // Fetch markets
    const rawMarkets = await fetchActiveMarkets(asset);
    
    if (rawMarkets.length === 0) {
        console.error('\n❌ No markets found. The API endpoint may have changed.');
        console.log('\n💡 Try visiting https://polymarket.com directly to find market IDs');
        console.log('   You can inspect network requests in browser DevTools to see the API structure.');
        process.exit(1);
    }

    // Parse markets
    const parsedMarkets = rawMarkets
        .map(m => parseMarket(m, asset))
        .filter((m): m is ParsedMarket => m !== null)
        .sort((a, b) => a.targetPrice - b.targetPrice);

    console.log(`\n📊 Parsed ${parsedMarkets.length} valid price markets:`);
    parsedMarkets.forEach((market, i) => displayMarket(market, i));

    // Generate strategies
    const strategiesData = generateStrategiesJson(parsedMarkets);

    if (strategiesData.strategies.length === 0) {
        console.error('\n❌ Could not generate strategies from available markets');
        process.exit(1);
    }

    // Write to file
    const outputPath = join(process.cwd(), outputFile);
    writeFileSync(
        outputPath,
        JSON.stringify(strategiesData, null, 2) + '\n'
    );

    console.log(`\n✅ Successfully wrote ${strategiesData.strategies.length} strategies to ${outputFile}`);
    console.log('\n📝 Strategies generated:');
    strategiesData.strategies.forEach((s: any) => {
        console.log(`\n   Strategy ${s.id}: ${s.name}`);
        s.polymarketOrders.forEach((o: any) => {
            console.log(`      - ${o.outcome} ${o.marketId.substring(0, 20)}... (${o.notionalBps / 100}%)`);
        });
    });

    console.log('\n🎉 Done! Restart your bridge service to use the new markets.');
}

// Run if called directly
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

