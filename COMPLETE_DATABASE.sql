-- ==========================================================
-- ReMarket - HOSTEL RESALE MANAGEMENT SYSTEM
-- COMPLETE DATABASE DOCUMENTATION & IMPLEMENTATION
-- ==========================================================
-- This file contains the full schema, procedural logic, 
-- and EVERY SQL QUERY used in the application controllers.

----------------------------------------------------------
-- 1. DATABASE SCHEMA (DDL)
----------------------------------------------------------
-- Purpose: Defines the physical structure of the marketplace.

-- Table: USERS
CREATE TABLE public.users (
  id uuid NOT NULL PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone character varying,
  role text DEFAULT 'Student' CHECK (role IN ('Student', 'Admin')),
  trust_score numeric DEFAULT 0.0 CHECK (trust_score >= 0 AND trust_score <= 5),
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Inactive')),
  password_hash text,
  refresh_token_hash text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: CATEGORIES
CREATE TABLE public.categories (
  category_id SERIAL PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text
);

-- Table: PRODUCTS
CREATE TABLE public.products (
  product_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.users(id),
  category_id integer REFERENCES public.categories(category_id),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price > 0),
  condition text CHECK (condition IN ('New', 'Good', 'Fair', 'Poor')),
  status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Reserved', 'Sold')),
  image_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: OFFERS
CREATE TABLE public.offers (
  offer_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(product_id),
  buyer_id uuid NOT NULL REFERENCES public.users(id),
  offered_price numeric NOT NULL CHECK (offered_price > 0),
  offer_date timestamp with time zone DEFAULT now(),
  offer_status text DEFAULT 'Pending' CHECK (offer_status IN ('Pending', 'Accepted', 'Rejected', 'Withdrawn'))
);

-- Table: TRANSACTIONS
CREATE TABLE public.transactions (
  transaction_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(product_id),
  buyer_id uuid NOT NULL REFERENCES public.users(id),
  seller_id uuid NOT NULL REFERENCES public.users(id),
  offer_id uuid REFERENCES public.offers(offer_id),
  final_price numeric NOT NULL CHECK (final_price > 0),
  transaction_date timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Completed' CHECK (status IN ('Completed', 'Disputed', 'Refunded'))
);

-- Table: REVIEWS
CREATE TABLE public.reviews (
  review_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(transaction_id),
  reviewer_id uuid NOT NULL REFERENCES public.users(id),
  reviewee_id uuid NOT NULL REFERENCES public.users(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: CHAT
CREATE TABLE public.chat (
  message_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(product_id),
  sender_id uuid NOT NULL REFERENCES public.users(id),
  receiver_id uuid NOT NULL REFERENCES public.users(id),
  message_text text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  is_read boolean DEFAULT false
);

-- Table: WISHLIST
CREATE TABLE public.wishlist (
  wishlist_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id),
  product_id uuid NOT NULL REFERENCES public.products(product_id),
  added_at timestamp with time zone DEFAULT now()
);

-- Table: CART
CREATE TABLE public.cart (
  cart_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id),
  product_id uuid NOT NULL REFERENCES public.products(product_id),
  added_at timestamp with time zone DEFAULT now()
);

----------------------------------------------------------
-- 2. PL/pgSQL PROCEDURAL LOGIC (FUNCTIONS & TRIGGERS)
----------------------------------------------------------

-- A. Automated Trust Score Recalculation
CREATE OR REPLACE FUNCTION public.fn_update_user_trust_score()
RETURNS TRIGGER AS $$
DECLARE
    new_avg_rating NUMERIC;
BEGIN
    SELECT AVG(rating)::NUMERIC(3,2) INTO new_avg_rating
    FROM public.reviews WHERE reviewee_id = NEW.reviewee_id;
    UPDATE public.users SET trust_score = COALESCE(new_avg_rating, 0.0)
    WHERE id = NEW.reviewee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_trust
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.fn_update_user_trust_score();

-- B. Sunday-Only Offer Enforcement
CREATE OR REPLACE FUNCTION public.fn_check_sunday_offer()
RETURNS TRIGGER AS $$
BEGIN
    IF EXTRACT(DOW FROM NOW()) != 0 THEN
        RAISE EXCEPTION 'OFFER_RESTRICTION: Offers can only be placed on Sundays.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_sunday_offers
BEFORE INSERT ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.fn_check_sunday_offer();

-- C. Atomic Sale Finalization
CREATE OR REPLACE PROCEDURE public.sp_finalize_deal(
    p_product_id uuid, p_buyer_id uuid, p_seller_id uuid, p_offer_id uuid, p_final_price numeric
)
AS $$
BEGIN
    PERFORM * FROM public.products WHERE product_id = p_product_id FOR UPDATE;
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE product_id = p_product_id AND status = 'available') THEN
        RAISE EXCEPTION 'TRANSACTION_ERROR: Product is no longer available.';
    END IF;
    INSERT INTO public.transactions (product_id, buyer_id, seller_id, offer_id, final_price, status)
    VALUES (p_product_id, p_buyer_id, p_seller_id, p_offer_id, p_final_price, 'Completed');
    IF p_offer_id IS NOT NULL THEN
        UPDATE public.offers SET offer_status = 'Accepted' WHERE offer_id = p_offer_id;
    END IF;
    COMMIT;
END;
$$ LANGUAGE plpgsql;

-- D. Global Sync on Sale
CREATE OR REPLACE FUNCTION public.fn_sync_marketplace_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
        DELETE FROM public.wishlist WHERE product_id = NEW.product_id;
        DELETE FROM public.cart WHERE product_id = NEW.product_id;
        UPDATE public.offers SET offer_status = 'Rejected' 
        WHERE product_id = NEW.product_id AND offer_status = 'Pending';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_marketplace
AFTER UPDATE OF status ON public.products
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_marketplace_on_sale();

----------------------------------------------------------
-- 3. QUERIES FROM CONTROLLERS (DML)
----------------------------------------------------------

-- [authController.js]
-- Check if email exists
SELECT id FROM public.users WHERE email = $1;
-- Register user
INSERT INTO public.users (id, name, email, password_hash, phone) VALUES ($1, $2, $3, $4, $5);
-- Login user
SELECT id, email, password_hash, role, status FROM public.users WHERE email = $1;
-- Refresh token check
SELECT id, email, role FROM public.users WHERE id = $1;

-- [productController.js]
-- Get all active products with seller stats
SELECT 
    p.product_id as id, p.name, p.description, p.price, p.seller_id,
    u.name as seller_name, c.name as category, p.status, p.image_url,
    COALESCE(rs.avg_rating, 0) as seller_rating, COALESCE(rs.total_reviews, 0) as seller_reviews
FROM public.products p
LEFT JOIN public.users u ON u.id = p.seller_id
LEFT JOIN public.categories c ON c.category_id = p.category_id
LEFT JOIN (
    SELECT reviewee_id, AVG(rating) as avg_rating, COUNT(*) as total_reviews
    FROM public.reviews GROUP BY reviewee_id
) rs ON rs.reviewee_id = p.seller_id
WHERE p.status = 'available'
ORDER BY p.created_at DESC;

-- Get user's own listings
SELECT 
    p.product_id as id, p.name, p.description, p.price, p.condition,
    c.name as category, p.status, p.created_at
FROM public.products p
JOIN public.categories c ON c.category_id = p.category_id
WHERE p.seller_id = $1
ORDER BY p.created_at DESC;

-- Add new product
INSERT INTO public.products (seller_id, category_id, name, description, price, condition, status, image_url)
VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7)
RETURNING product_id as id, name;

-- Delete product (Self-only)
DELETE FROM public.products WHERE product_id = $1 AND seller_id = $2 RETURNING name;

-- Update product (Dynamic query builder)
UPDATE public.products SET updated_at = NOW(), name = $3, ... WHERE product_id = $1 AND seller_id = $2 RETURNING *;

-- [categoryController.js]
-- Get all categories
SELECT category_id as id, name FROM public.categories ORDER BY name ASC;

-- [chatController.js]
-- Send message
INSERT INTO public.chat (product_id, sender_id, receiver_id, message_text)
VALUES ($1, $2, $3, $4) RETURNING *;

-- Get conversation list for user
WITH convos AS (
    SELECT
        c.product_id,
        CASE WHEN c.sender_id = $1 THEN c.receiver_id ELSE c.sender_id END AS other_user_id,
        MAX(c.sent_at) AS last_message_at,
        COUNT(*) FILTER (WHERE c.receiver_id = $1 AND c.is_read = false) AS unread_count
    FROM public.chat c
    WHERE c.sender_id = $1 OR c.receiver_id = $1
    GROUP BY c.product_id, other_user_id
)
SELECT
    cv.product_id, p.name AS product_name, cv.other_user_id, u.name AS other_user_name,
    cv.last_message_at, cv.unread_count,
    (SELECT message_text FROM public.chat sub WHERE sub.product_id = cv.product_id AND ((sub.sender_id = $1 AND sub.receiver_id = cv.other_user_id) OR (sub.receiver_id = $1 AND sub.sender_id = cv.other_user_id)) ORDER BY sub.sent_at DESC LIMIT 1) AS last_message_text
FROM convos cv
LEFT JOIN public.users u ON u.id = cv.other_user_id
LEFT JOIN public.products p ON p.product_id = cv.product_id
ORDER BY cv.last_message_at DESC;

-- Get message thread
SELECT message_id, sender_id, receiver_id, message_text, sent_at, is_read
FROM public.chat
WHERE product_id = $1 AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
ORDER BY sent_at ASC;

-- Mark messages as read
UPDATE public.chat SET is_read = true 
WHERE product_id = $1 AND receiver_id = $2 AND sender_id = $3 AND is_read = false
RETURNING message_id;

-- [reviewController.js]
-- Submit review (Procedural call)
CALL submit_review($1, $2, $3, $4);

-- Get reviews for a user
SELECT u.name AS reviewer, r.rating, r.comment
FROM reviews r
JOIN users u ON r.reviewer_id = u.id
WHERE r.reviewee_id = $1
ORDER BY r.review_id DESC;

-- Get rating summary
SELECT
    COALESCE(AVG(r.rating), 0) AS avg_rating,
    COUNT(r.review_id) AS total_reviews,
    CASE WHEN AVG(r.rating) >= 4 THEN 'Good' WHEN AVG(r.rating) >= 2 THEN 'Average' ELSE 'Poor' END AS rating_status
FROM reviews r
WHERE r.reviewee_id = $1;

-- [wishlistController.js]
-- Add to wishlist
INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2);

-- Get wishlist items
SELECT w.wishlist_id, p.product_id, p.name, p.price, p.status, w.added_at
FROM wishlist w
JOIN products p ON w.product_id = p.product_id
WHERE w.user_id = $1;

-- Remove from wishlist
DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2;

----------------------------------------------------------
-- 4. ANALYTICAL QUERIES
----------------------------------------------------------

-- SALES TRENDS BY CATEGORY
SELECT c.name, COUNT(t.transaction_id) as sales_count, SUM(t.final_price) as total_revenue
FROM categories c
JOIN products p ON c.category_id = p.category_id
JOIN transactions t ON p.product_id = t.product_id
GROUP BY c.name
ORDER BY total_revenue DESC;

-- TOP RATED SELLERS
SELECT name, trust_score, 	(SELECT COUNT(*) FROM products WHERE seller_id = users.id AND status = 'sold') as items_sold
FROM users
WHERE role = 'Student'
ORDER BY trust_score DESC, items_sold DESC
LIMIT 10;
