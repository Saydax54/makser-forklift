CREATE POLICY "servis fotograflari read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'servis-fotograflari');

CREATE POLICY "servis fotograflari insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'servis-fotograflari');

CREATE POLICY "servis fotograflari update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'servis-fotograflari' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (bucket_id = 'servis-fotograflari');

CREATE POLICY "servis fotograflari delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'servis-fotograflari' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
