-- Servis fotoğrafları
CREATE TABLE public.forklift_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forklift_id uuid REFERENCES public.forklifts(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forklift_photos TO authenticated;
GRANT ALL ON public.forklift_photos TO service_role;

ALTER TABLE public.forklift_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forklift photos read" ON public.forklift_photos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "forklift photos insert" ON public.forklift_photos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "forklift photos update" ON public.forklift_photos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());
CREATE POLICY "forklift photos delete" ON public.forklift_photos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());

CREATE INDEX forklift_photos_forklift_idx ON public.forklift_photos(forklift_id);
CREATE INDEX forklift_photos_order_idx ON public.forklift_photos(work_order_id);

-- İş devri kayıtları
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS transferred_from uuid REFERENCES public.technicians(id),
  ADD COLUMN IF NOT EXISTS transfer_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invoice_no text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoiced_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_note text NOT NULL DEFAULT '';
