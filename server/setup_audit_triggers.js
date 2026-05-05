const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- 1. Function to log product changes
CREATE OR REPLACE FUNCTION public.fn_audit_product_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change into audit_logs table
    INSERT INTO public.audit_logs (target_id, action, performed_by)
    VALUES (
        NEW.product_id, 
        'Price/Status Change for: ' || NEW.name || ' (Price: ' || OLD.price || ' -> ' || NEW.price || ', Status: ' || OLD.status || ' -> ' || NEW.status || ')', 
        NEW.seller_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger for Audit Logging
DROP TRIGGER IF EXISTS trg_audit_product ON public.products;
CREATE TRIGGER trg_audit_product
AFTER UPDATE ON public.products
FOR EACH ROW
WHEN (OLD.price IS DISTINCT FROM NEW.price OR OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_audit_product_update();
`;

async function main() {
    try {
        console.log('Connecting to database...');
        await pool.query(sql);
        console.log('✅ Audit triggers implemented successfully!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

main();
