ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_person text NOT NULL DEFAULT '';

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS service_items jsonb NOT NULL DEFAULT '[]'::jsonb;