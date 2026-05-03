-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cart (
  cart_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_pkey PRIMARY KEY (cart_id),
  CONSTRAINT cart_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT cart_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);
CREATE TABLE public.categories (
  category_id integer NOT NULL DEFAULT nextval('categories_category_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  description text,
  CONSTRAINT categories_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.chat (
  message_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message_text text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  is_read boolean DEFAULT false,
  CONSTRAINT chat_pkey PRIMARY KEY (message_id),
  CONSTRAINT chat_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT chat_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT chat_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id)
);
CREATE TABLE public.offers (
  offer_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  offered_price numeric NOT NULL CHECK (offered_price > 0::numeric),
  offer_date timestamp with time zone DEFAULT now(),
  offer_status text DEFAULT 'Pending'::text CHECK (offer_status = ANY (ARRAY['Pending'::text, 'Accepted'::text, 'Rejected'::text, 'Withdrawn'::text])),
  CONSTRAINT offers_pkey PRIMARY KEY (offer_id),
  CONSTRAINT offers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT offers_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id)
);
CREATE TABLE public.products (
  product_id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  category_id integer,
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price > 0::numeric),
  condition text CHECK (condition = ANY (ARRAY['New'::text, 'Good'::text, 'Fair'::text, 'Poor'::text])),
  status text DEFAULT 'Draft'::text CHECK (status = ANY (ARRAY['Draft'::text, 'Active'::text, 'Reserved'::text, 'Sold'::text])),
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  CONSTRAINT products_pkey PRIMARY KEY (product_id),
  CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.reviews (
  review_id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (review_id),
  CONSTRAINT reviews_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(transaction_id),
  CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id),
  CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.users(id)
);
CREATE TABLE public.transactions (
  transaction_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  offer_id uuid,
  final_price numeric NOT NULL CHECK (final_price > 0::numeric),
  transaction_date timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Completed'::text CHECK (status = ANY (ARRAY['Completed'::text, 'Disputed'::text, 'Refunded'::text])),
  CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transactions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id),
  CONSTRAINT transactions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT transactions_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(offer_id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone character varying,
  role text DEFAULT 'Student'::text CHECK (role = ANY (ARRAY['Student'::text, 'Admin'::text])),
  trust_score numeric DEFAULT 0.0 CHECK (trust_score >= 0::numeric AND trust_score <= 5::numeric),
  status text DEFAULT 'Active'::text CHECK (status = ANY (ARRAY['Active'::text, 'Suspended'::text, 'Inactive'::text])),
  created_at timestamp with time zone DEFAULT now(),
  password_hash text,
  refresh_token_hash text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wishlist (
  wishlist_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wishlist_pkey PRIMARY KEY (wishlist_id),
  CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);