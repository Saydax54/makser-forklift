CREATE TYPE public.app_role AS ENUM ('admin','technician');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  forklift_brand text NOT NULL DEFAULT '',
  forklift_model text NOT NULL DEFAULT '',
  serial_no text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technicians TO authenticated;
GRANT ALL ON public.technicians TO service_role;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  fault_description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  service_note text NOT NULL DEFAULT '',
  signature_data text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "customers read" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "customers update" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "customers delete" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "technicians read" ON public.technicians FOR SELECT TO authenticated USING (true);
CREATE POLICY "technicians admin insert" ON public.technicians FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "technicians update" ON public.technicians FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());
CREATE POLICY "technicians admin delete" ON public.technicians FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "work orders read" ON public.work_orders FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
);
CREATE POLICY "work orders admin insert" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "work orders update" ON public.work_orders FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
);
CREATE POLICY "work orders admin delete" ON public.work_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_name text;
  v_phone text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  INSERT INTO public.profiles (id, full_name, phone) VALUES (NEW.id, v_name, v_phone)
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    v_role := 'technician';
  ELSE
    v_role := 'admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'technician' THEN
    INSERT INTO public.technicians (user_id, full_name, phone) VALUES (NEW.id, v_name, v_phone)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();