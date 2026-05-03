const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function syncStatuses() {
    const client = await pool.connect();
    try {
        console.log('Syncing existing product statuses to lowercase ENUMs...');
        
        // This might fail if the column is already an enum and has 'Active'? 
        // No, if it's an enum, it couldn't have 'Active' unless the enum allowed it.
        // If it's an enum and the code tried to insert 'Active', it failed.
        // So we only need to worry about existing 'Active' strings if it was a TEXT column before.
        
        // Let's just try to update anything that looks like 'Active' or 'Sold'
        const result = await client.query(`
            UPDATE products 
            SET status = 'available' 
            WHERE status::text = 'Active' OR status::text = 'Available';
        `);
        console.log(`Updated ${result.rowCount} products to 'available'`);

        const result2 = await client.query(`
            UPDATE products 
            SET status = 'sold' 
            WHERE status::text = 'Sold';
        `);
        console.log(`Updated ${result2.rowCount} products to 'sold'`);

    } catch (err) {
        console.error('Sync error (likely already correct):', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

syncStatuses();
