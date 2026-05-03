const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- 1. Update Product Status Enum values if they are text, but here we use lowercase
-- 2. Update the stored procedure sp_finalize_deal
CREATE OR REPLACE PROCEDURE public.sp_finalize_deal(
    p_product_id uuid, p_buyer_id uuid, p_seller_id uuid, p_offer_id uuid, p_final_price numeric
)
AS $$
BEGIN
    -- Row-level lock to prevent race conditions
    PERFORM * FROM public.products WHERE product_id = p_product_id FOR UPDATE;

    -- Guard: check for 'available' (lowercase)
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE product_id = p_product_id AND status = 'available') THEN
        RAISE EXCEPTION 'TRANSACTION_ERROR: Product is no longer available.';
    END IF;

    -- Record transaction
    INSERT INTO public.transactions (product_id, buyer_id, seller_id, offer_id, final_price, status)
    VALUES (p_product_id, p_buyer_id, p_seller_id, p_offer_id, p_final_price, 'Completed');

    -- Mark offer as accepted
    IF p_offer_id IS NOT NULL THEN
        UPDATE public.offers SET offer_status = 'Accepted' WHERE offer_id = p_offer_id;
    END IF;

    COMMIT;
END;
$$ LANGUAGE plpgsql;

-- 3. Update Trigger Function fn_auto_mark_sold
CREATE OR REPLACE FUNCTION public.fn_auto_mark_sold()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products SET status = 'sold' WHERE product_id = NEW.product_id;
    UPDATE public.offers SET offer_status = 'Rejected' WHERE product_id = NEW.product_id AND offer_status = 'Pending';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update Trigger Function fn_sync_marketplace_on_sale
CREATE OR REPLACE FUNCTION public.fn_sync_marketplace_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
        DELETE FROM public.wishlist WHERE product_id = NEW.product_id;
        DELETE FROM public.cart WHERE product_id = NEW.product_id;
        UPDATE public.offers SET offer_status = 'Rejected' WHERE product_id = NEW.product_id AND offer_status = 'Pending';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

async function applyFix() {
    console.log('Connecting to database...');
    const client = await pool.connect();
    try {
        console.log('Applying PL/pgSQL lowercase ENUM fixes...');
        await client.query(sql);
        console.log('✅ Fixes applied successfully!');
    } catch (err) {
        console.error('❌ Failed to apply fixes:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

applyFix();
