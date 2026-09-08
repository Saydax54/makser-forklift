CREATE TABLE public.forklifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  serial_no text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forklifts TO authenticated;
GRANT ALL ON public.forklifts TO service_role;

ALTER TABLE public.forklifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forklifts read" ON public.forklifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "forklifts insert" ON public.forklifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "forklifts update" ON public.forklifts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "forklifts delete" ON public.forklifts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX forklifts_customer_id_idx ON public.forklifts(customer_id);

INSERT INTO public.forklifts (customer_id, brand, model, serial_no)
SELECT id, forklift_brand, forklift_model, serial_no
FROM public.customers
WHERE coalesce(forklift_brand,'') <> '' OR coalesce(forklift_model,'') <> '' OR coalesce(serial_no,'') <> '';

ALTER TABLE public.work_orders ADD COLUMN forklift_id uuid REFERENCES public.forklifts(id) ON DELETE SET NULL;

UPDATE public.work_orders w
SET forklift_id = f.id
FROM public.forklifts f
WHERE f.customer_id = w.customer_id AND w.forklift_id IS NULL;