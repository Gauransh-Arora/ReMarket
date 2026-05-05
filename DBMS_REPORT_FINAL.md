# ReMarket - HOSTEL RESALE MANAGEMENT SYSTEM
**Database Management Systems (UCS310)**

**Team Members:**
- Sarwangini Hamal (1024170262)
- Aashi Tyagi (1024170263)
- Kirandeep Kaur (1024170280)
- Gauransh Arora (1024170264)

**Class Group:** 2Q25
**Submitted to:** Dr. Reaya Grewal

---

## INTRODUCTION
The proposed system falls under the domain of E-Commerce and Marketplace Management Systems, specifically designed for a hostel environment. It enables students to buy and sell used items such as books, electronics, furniture, and appliances within a controlled campus ecosystem.

### Why DBMS is Essential:
- **Data Integrity**: PK/FK constraints ensure users, products, and offers are valid and consistent.
- **Concurrency Control**: Multiple students can browse, list, and buy simultaneously without conflicts using Row-Level Locking.
- **Transaction Safety**: ACID properties ensure purchase operations are atomic (all-or-nothing).
- **Business Rule Enforcement**: Triggers implement campus-specific rules like Sunday-only offers.

---

## PROBLEM STATEMENT
Students purchase items for temporary academic use but lack a structured platform to resell them at semester-end. Existing informal methods (WhatsApp/Notice Boards) lack:
1. Real-time availability tracking.
2. Data integrity (duplicate entries, invalid references).
3. Trust/rating systems to evaluate seller reliability.
4. Transaction records for accountability.

---

## DATABASE DESIGN & ER DIAGRAM

### Entities and Attributes
- **USERS**: `id` (PK), `name`, `email` (UNIQUE), `trust_score`, `role`, `status`.
- **PRODUCTS**: `product_id` (PK), `seller_id` (FK), `category_id` (FK), `name`, `price`, `status` (available, reserved, sold).
- **OFFERS**: `offer_id` (PK), `product_id` (FK), `buyer_id` (FK), `offered_price`, `offer_status`.
- **TRANSACTIONS**: `transaction_id` (PK), `product_id` (FK), `buyer_id` (FK), `final_price`.
- **AUDIT_LOGS**: `log_id` (PK), `target_id` (uuid), `action` (text), `performed_by` (FK), `timestamp`.

---

## NORMALIZATION
The ReMarket database is normalized up to **Boyce-Codd Normal Form (BCNF)**.
- **1NF**: All attributes are atomic; no multi-valued fields.
- **2NF**: No partial dependencies; all non-key attributes depend on the entire primary key.
- **3NF**: No transitive dependencies; non-key attributes (like `trust_score`) are computed or stored only in their primary entity.
- **BCNF**: For every functional dependency $X \rightarrow Y$, $X$ is a superkey.

---

## DATABASE IMPLEMENTATION (DDL)

### 1. Product Status Enum
```sql
CREATE TYPE product_status AS ENUM ('available', 'reserved', 'sold');
```

### 2. Products Table
```sql
CREATE TABLE public.products (
  product_id  uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id   uuid NOT NULL REFERENCES public.users(id),
  category_id integer REFERENCES public.categories(category_id),
  name        text NOT NULL,
  price       numeric NOT NULL CHECK (price > 0),
  condition   text CHECK (condition IN ('New','Good','Fair','Poor')),
  status      product_status DEFAULT 'available',
  created_at  timestamptz DEFAULT now()
);
```

### 3. Audit Logs (Implemented)
```sql
CREATE TABLE public.audit_logs (
  log_id      SERIAL PRIMARY KEY,
  target_id   uuid,
  action      text,
  performed_by uuid REFERENCES public.users(id),
  timestamp   timestamptz DEFAULT now()
);
```

---

## PL/pgSQL PROCEDURAL LOGIC
ReMarket uses PL/pgSQL to automate business logic directly within the database layer.

### 1. Stored Procedure: Atomic Sale Finalization
Handles the complete, atomic sequence of finalizing a deal using **TCL (Transaction Control Language)**.
```sql
CREATE OR REPLACE PROCEDURE public.sp_finalize_deal(...)
AS $$
BEGIN
    -- TCL: Acquire Row-Level Lock (Isolation)
    PERFORM * FROM public.products WHERE product_id = p_product_id FOR UPDATE;

    -- Guard: check for 'available'
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE product_id = p_product_id AND status = 'available') THEN
        RAISE EXCEPTION 'TRANSACTION_ERROR: Product is no longer available.';
    END IF;

    -- Record transaction
    INSERT INTO public.transactions (...) VALUES (...);

    -- TCL: Finalize Transaction
    COMMIT;
END;
$$ LANGUAGE plpgsql;
```

### 2. Trigger: Automated Trust Scoring
Automatically updates a user's reputation after every review.
```sql
CREATE OR REPLACE FUNCTION fn_update_user_trust_score() RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users SET trust_score = (SELECT AVG(rating) FROM reviews WHERE reviewee_id = NEW.reviewee_id)
    WHERE id = NEW.reviewee_id;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_trust AFTER INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION fn_update_user_trust_score();
```

### 3. Trigger: Sunday-Only Offer Enforcement
Enforces campus business rules at the database level.
```sql
CREATE OR REPLACE FUNCTION fn_check_sunday_offer() RETURNS TRIGGER AS $$
BEGIN
    IF EXTRACT(DOW FROM NOW()) != 0 THEN
        RAISE EXCEPTION 'Offers only allowed on Sundays.';
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_sunday_offers BEFORE INSERT ON offers FOR EACH ROW EXECUTE FUNCTION fn_check_sunday_offer();
```

### 4. Trigger: Global Marketplace Sync
Ensures data consistency by cleaning Wishlists and Carts when a product is sold.
```sql
CREATE OR REPLACE FUNCTION fn_sync_marketplace_on_sale() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sold' THEN
        DELETE FROM public.wishlist WHERE product_id = NEW.product_id;
        DELETE FROM public.cart WHERE product_id = NEW.product_id;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_marketplace AFTER UPDATE OF status ON products FOR EACH ROW EXECUTE FUNCTION fn_sync_marketplace_on_sale();
```

### 5. Trigger: Automated Audit Logging
Tracks price and status history for security and transparency.
```sql
CREATE OR REPLACE FUNCTION fn_audit_product_update() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (target_id, action, performed_by)
    VALUES (NEW.product_id, 'Status/Price change', NEW.seller_id);
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_product AFTER UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fn_audit_product_update();
```

---

## TRANSACTION MANAGEMENT & TCL
ReMarket implements full ACID-compliant transaction management:
- **TCL Commands**:
    - **`COMMIT`**: Used in stored procedures to persist finalized sales.
    - **`ROLLBACK`**: Automatically triggered by the database if an exception (like Sunday-Only violation) is raised.
- **Concurrency Control**: 
    - **`SELECT ... FOR UPDATE`**: Acquires a row-level lock during checkout to prevent race conditions (Double Selling).
- **ACID Support**:
    - **Atomicity**: The `sp_finalize_deal` ensures that the transaction record and product status update happen together.
    - **Consistency**: FK constraints prevent orphaned records in the `OFFERS` or `CART` tables.
    - **Isolation**: `SELECT FOR UPDATE` prevents concurrent purchase anomalies.
    - **Durability**: PostgreSQL Write-Ahead Logging (WAL) ensures transactions are saved even during crashes.

---

## EXPECTED OUTCOMES
1. **Reduced Waste**: Promotes reuse within the hostel community.
2. **Accountability**: All negotiations and sales are logged.
3. **Efficiency**: Automated trust scores and Sunday-only offer enforcement reduce administrative overhead.
4. **Data-Driven Insights**: Categorical sales trends help understand student demand.

---

## CONCLUSION
ReMarket demonstrates the power of a Relational DBMS in a campus setting. By moving away from informal file-based or chat-based trading to a structured SQL system, we achieve data integrity, security, and a seamless user experience.
