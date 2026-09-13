CREATE SEQUENCE IF NOT EXISTS public.forklift_code_seq;

ALTER TABLE public.forklifts
  ADD COLUMN IF NOT EXISTS code text NOT NULL DEFAULT ('MK-' || lpad(nextval('public.forklift_code_seq')::text, 4, '0')),
  ADD COLUMN IF NOT EXISTS hour_meter numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_service_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_service_hours numeric,
  ADD COLUMN IF NOT EXISTS service_interval_hours integer NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS service_interval_months integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS fuel_type text NOT NULL DEFAULT 'diesel';

CREATE UNIQUE INDEX IF NOT EXISTS forklifts_code_key ON public.forklifts (code);

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS hour_meter numeric,
  ADD COLUMN IF NOT EXISTS form_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS form_approved_at timestamptz;