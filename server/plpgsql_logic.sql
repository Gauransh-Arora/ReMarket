-- ==========================================================
-- ReMarket PL/pgSQL & Database Logic Documentation
-- ==========================================================
-- This file contains all the stored procedures, functions, 
-- and triggers implemented for the ReMarket platform.

-- 1. USER & REPUTATION SYSTEM
-- ----------------------------------------------------------

-- Set default trust score to 0.0 for new students
ALTER TABLE public.users ALTER COLUMN trust_score SET DEFAULT 0.0;

-- Function: Automatically recalculate trust score after a review
CREATE OR REPLACE FUNCTION public.fn_update_user_trust_score()
RETURNS TRIGGER AS $$
DECLARE
    new_avg_rating NUMERIC;
BEGIN
    SELECT AVG(rating)::NUMERIC(3,2)
    INTO new_avg_rating
    FROM public.reviews
    WHERE reviewee_id = NEW.reviewee_id;

    UPDATE public.users
    SET trust_score = COALESCE(new_avg_rating, 0.0)
    WHERE id = NEW.reviewee_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Recalculate on every review insert or update
DROP TRIGGER IF EXISTS trg_recalculate_trust ON public.reviews;
CREATE TRIGGER trg_recalculate_trust
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_user_trust_score();


-- 2. TRANSACTION & PURCHASE LOGIC
-- ----------------------------------------------------------

-- Procedure: Atomic Finalization of a Deal
-- Handles locking, availability check, and transaction creation in one step.
CREATE OR REPLACE PROCEDURE public.sp_finalize_deal(
    p_product_id uuid, 
    p_buyer_id uuid, 
    p_seller_id uuid, 
    p_offer_id uuid, 
    p_final_price numeric
)
AS $$
BEGIN
    -- 1. Lock the product row to prevent race conditions (Double Selling)
    PERFORM * FROM public.products 
    WHERE product_id = p_product_id 
    FOR UPDATE;

    -- 2. Verify product is still active
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE product_id = p_product_id AND status = 'available') THEN
        RAISE EXCEPTION 'TRANSACTION_ERROR: Product is no longer available.';
    END IF;

    -- 3. Insert the transaction
    INSERT INTO public.transactions (product_id, buyer_id, seller_id, offer_id, final_price, status)
    VALUES (p_product_id, p_buyer_id, p_seller_id, p_offer_id, p_final_price, 'Completed');

    -- 4. Update the specific offer status if applicable
    IF p_offer_id IS NOT NULL THEN
        UPDATE public.offers 
        SET offer_status = 'Accepted' 
        WHERE offer_id = p_offer_id;
    END IF;

    COMMIT;
END;
$$ LANGUAGE plpgsql;

-- Function: Automatically mark product as sold and cleanup offers
CREATE OR REPLACE FUNCTION public.fn_auto_mark_sold()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET status = 'sold'
    WHERE product_id = NEW.product_id;
    
    -- Also reject all other pending offers for this product
    UPDATE public.offers
    SET offer_status = 'Rejected'
    WHERE product_id = NEW.product_id AND offer_status = 'Pending';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire when a new transaction is recorded
DROP TRIGGER IF EXISTS trg_update_product_on_sale ON public.transactions;
CREATE TRIGGER trg_update_product_on_sale
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_mark_sold();


-- 3. MARKETPLACE SYNC & CLEANUP
-- ----------------------------------------------------------

-- Function: Global sync when an item is sold
-- Removes item from all wishlists and carts across the platform.
CREATE OR REPLACE FUNCTION public.fn_sync_marketplace_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
        -- Clear from all wishlists
        DELETE FROM public.wishlist WHERE product_id = NEW.product_id;
        
        -- Clear from all active carts
        DELETE FROM public.cart WHERE product_id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire on product status update
DROP TRIGGER IF EXISTS trg_sync_marketplace ON public.products;
CREATE TRIGGER trg_sync_marketplace
AFTER UPDATE OF status ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_marketplace_on_sale();


-- 4. FRAUD & BUSINESS RULES
-- ----------------------------------------------------------

-- Function: Prevent sellers from reviewing themselves
CREATE OR REPLACE FUNCTION public.fn_prevent_self_review()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
BEGIN
    SELECT seller_id INTO v_seller_id 
    FROM transactions 
    WHERE transaction_id = NEW.transaction_id;

    IF NEW.reviewer_id = v_seller_id THEN
        RAISE EXCEPTION 'FRAUD_PREVENTION: Sellers cannot review themselves.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Intercept review insertion
DROP TRIGGER IF EXISTS trg_no_self_review ON public.reviews;
CREATE TRIGGER trg_no_self_review
BEFORE INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_self_review();

-- Function: Enforce "Sunday Only" offers
CREATE OR REPLACE FUNCTION public.fn_check_sunday_offer()
RETURNS TRIGGER AS $$
BEGIN
    -- 0 is Sunday in PostgreSQL
    IF EXTRACT(DOW FROM NOW()) != 0 THEN
        RAISE EXCEPTION 'OFFER_RESTRICTION: Offers can only be placed on Sundays.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Register offer restriction
DROP TRIGGER IF EXISTS trg_enforce_sunday_offers ON public.offers;
CREATE TRIGGER trg_enforce_sunday_offers
BEFORE INSERT ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_sunday_offer();


-- 5. REVIEW SYSTEM HELPERS
-- ----------------------------------------------------------

-- Procedure: Submit a verified review
-- Automatically identifies the reviewee based on transaction participants.
CREATE OR REPLACE PROCEDURE public.submit_review(
    p_transaction_id uuid, 
    p_reviewer_id uuid, 
    p_rating integer, 
    p_comment text
)
AS $$
DECLARE
    v_reviewee UUID;
BEGIN
    SELECT CASE
        WHEN buyer_id = p_reviewer_id THEN seller_id
        ELSE buyer_id
    END
    INTO v_reviewee
    FROM transactions
    WHERE transaction_id = p_transaction_id;

    INSERT INTO reviews(transaction_id, reviewer_id, reviewee_id, rating, comment)
    VALUES (p_transaction_id, p_reviewer_id, v_reviewee, p_rating, p_comment);
END;
$$ LANGUAGE plpgsql;
