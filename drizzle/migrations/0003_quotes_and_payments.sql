ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS quote_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quote_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS quote_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS quote_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS quote_approved_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quote_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.work_orders
SET quote_status = 'approved', quote_items = service_items,
    quote_created_at = COALESCE(form_approved_at, completed_at),
    quote_approved_at = form_approved_at
WHERE form_approved = true AND quote_status = 'none';