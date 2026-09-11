CREATE TABLE public.service_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  fuel_type text NOT NULL DEFAULT 'all',
  description text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_templates TO authenticated;
GRANT ALL ON public.service_templates TO service_role;

ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service templates read" ON public.service_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "service templates admin insert" ON public.service_templates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service templates admin update" ON public.service_templates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service templates admin delete" ON public.service_templates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_service_templates_updated_at
BEFORE UPDATE ON public.service_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.service_templates (name, fuel_type, description, items) VALUES
('DİZEL FORKLİFT PERİYODİK BAKIM', 'diesel', 'Dizel forkliftler için standart periyodik bakım kalemleri', '[
  {"title":"MOTOR YAĞI","qty":"8","unit":"litre"},
  {"title":"YAĞ FİLTRESİ","qty":"1","unit":"adet"},
  {"title":"YAKIT FİLTRESİ","qty":"1","unit":"adet"},
  {"title":"HAVA FİLTRESİ","qty":"1","unit":"adet"},
  {"title":"HİDROLİK YAĞ KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"HİDROLİK FİLTRESİ","qty":"1","unit":"adet"},
  {"title":"ANTİFRİZ / SOĞUTMA SUYU KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"FREN AYARI VE KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"ZİNCİR YAĞLAMA VE GERGİ AYARI","qty":"1","unit":"adet"},
  {"title":"LASTİK VE JANT KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"GERİ İKAZ KORNASI KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"GENEL YAĞLAMA VE GRESLEME","qty":"1","unit":"adet"}
]'::jsonb),
('ELEKTRİKLİ FORKLİFT PERİYODİK BAKIM', 'electric', 'Elektrikli forkliftler için standart periyodik bakım kalemleri', '[
  {"title":"AKÜ SU SEVİYESİ KONTROLÜ VE TAKVİYESİ","qty":"1","unit":"adet"},
  {"title":"AKÜ KUTUP BAŞI TEMİZLİĞİ","qty":"1","unit":"adet"},
  {"title":"ŞARJ CİHAZI VE KABLO KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"MOTOR KÖMÜR KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"KONTAKTÖR KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"HİDROLİK YAĞ KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"FREN AYARI VE KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"ZİNCİR YAĞLAMA VE GERGİ AYARI","qty":"1","unit":"adet"},
  {"title":"TEKERLEK VE RULMAN KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"GERİ İKAZ KORNASI KONTROLÜ","qty":"1","unit":"adet"},
  {"title":"GENEL YAĞLAMA VE GRESLEME","qty":"1","unit":"adet"}
]'::jsonb);