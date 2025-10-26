#!/usr/bin/env tsx
/**
 * Validate Polymarket Market IDs
 * 
 * This script validates market IDs by querying the Polymarket API
 * to check if they exist and are active.
 * 
 * Usage:
 *   tsx scripts/validate-market-ids.ts <marketId1> [marketId2] [marketId3] ...
 */

const POLYMARKET_API = 'https://clob.polymarket.com';

interface MarketValidation {
    marketId: string;
    exists: boolean;
    active?: boolean;
    closed?: boolean;
    question?: string;
    endDate?: string;
    error?: string;
}

/**
 * Validate a single market ID
 */
async function validateMarketId(marketId: string): Promise<MarketValidation> {
    try {
        console.log(`\n🔍 Validating ${marketId}...`);
        
        const url = `${POLYMARKET_API}/markets/${marketId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (response.status === 404) {
            return {
                marketId,
                exists: false,
                error: 'Market not found (404)',
            };
        }

        if (!response.ok) {
            return {
                marketId,
                exists: false,
                error: `API error: ${response.status} ${response.statusText}`,
            };
        }

        const data = await response.json();
        
        return {
            marketId,
            exists: true,
            active: data.active !== undefined ? data.active : true,
            closed: data.closed !== undefined ? data.closed : false,
            question: data.question || data.description || 'N/A',
            endDate: data.end_date_iso || data.endTime || data.game_start_time || 'N/A',
        };
    } catch (error) {
        return {
            marketId,
            exists: false,
            error: (error as Error).message,
        };
    }
}

/**
 * Display validation result
 */
function displayResult(result: MarketValidation): void {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Market ID: ${result.marketId}`);
    console.log(`Status: ${result.exists ? '✅ Valid' : '❌ Invalid'}`);
    
    if (result.exists) {
        console.log(`Active: ${result.active ? '✅ Yes' : '⚠️  No'}`);
        console.log(`Closed: ${result.closed ? '⚠️  Yes' : '✅ No'}`);
        console.log(`Question: ${result.question}`);
        console.log(`End Date: ${result.endDate}`);
    } else {
        console.log(`Error: ${result.error}`);
    }
}

/**
 * Main function
 */
async function main() {
    const marketIds = process.argv.slice(2);

    console.log('🔐 Polymarket Market ID Validator');
    console.log('=================================\n');

    if (marketIds.length === 0) {
        console.log('Usage: tsx scripts/validate-market-ids.ts <marketId1> [marketId2] ...');
        console.log('\nExample:');
        console.log('  tsx scripts/validate-market-ids.ts 21742633143463906290569050155826241533067272736897614950488156847949938836455');
        console.log('\n💡 To find market IDs:');
        console.log('  1. Go to https://polymarket.com');
        console.log('  2. Find a market you want (e.g., "Will BTC be above $110k by Oct 31?")');
        console.log('  3. Click on it and look at the URL or inspect network requests');
        console.log('  4. The token ID is a long number (70+ digits)');
        process.exit(1);
    }

    console.log(`Validating ${marketIds.length} market ID(s)...\n`);

    const results: MarketValidation[] = [];
    for (const marketId of marketIds) {
        const result = await validateMarketId(marketId);
        results.push(result);
        displayResult(result);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('\n📊 Summary:');
    console.log(`   Total: ${results.length}`);
    console.log(`   Valid: ${results.filter(r => r.exists).length}`);
    console.log(`   Invalid: ${results.filter(r => !r.exists).length}`);
    console.log(`   Active: ${results.filter(r => r.active).length}`);
    console.log(`   Closed: ${results.filter(r => r.closed).length}`);

    const validMarkets = results.filter(r => r.exists && r.active && !r.closed);
    if (validMarkets.length > 0) {
        console.log('\n✅ Valid & Active Markets:');
        validMarkets.forEach(m => {
            console.log(`   ${m.marketId}`);
            console.log(`     └─ ${m.question}`);
        });
    }
}

// Run if called directly
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

