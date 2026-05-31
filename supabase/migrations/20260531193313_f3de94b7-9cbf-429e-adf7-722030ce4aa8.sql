
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.payment_status AS ENUM ('paid', 'partial', 'due');
CREATE TYPE public.process_status AS ENUM (
  'pending_characterization',
  'in_characterization',
  'pending_approval',
  'implementation',
  'training',
  'live'
);
CREATE TYPE public.doc_type AS ENUM ('free', 'ten_hours', 'daily_summary');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Auto-create profile + assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  SELECT COUNT(*) = 0 INTO is_first FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::app_role ELSE 'member'::app_role END);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS profiles
CREATE POLICY "profiles_select_all_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin());

-- RLS user_roles
CREATE POLICY "user_roles_select_all" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status public.payment_status NOT NULL DEFAULT 'paid',
  process_status public.process_status NOT NULL DEFAULT 'pending_characterization',
  characterization_text TEXT DEFAULT '',
  miro_link TEXT DEFAULT '',
  characterization_hours_estimate NUMERIC(10,2) DEFAULT 0,
  free_notes TEXT DEFAULT '',
  last_10h_threshold INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select_own_or_admin" ON public.clients
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "clients_insert_admin_or_self" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR owner_id = auth.uid());
CREATE POLICY "clients_update_own_or_admin" ON public.clients
  FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "clients_delete_admin" ON public.clients
  FOR DELETE TO authenticated USING (public.is_admin());

-- ============ CLIENT PAYMENTS ============
CREATE TABLE public.client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  hours_paid NUMERIC(10,2) NOT NULL,
  note TEXT DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_payments TO authenticated;
GRANT ALL ON public.client_payments TO service_role;
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON public.client_payments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "payments_insert" ON public.client_payments
  FOR INSERT TO authenticated WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "payments_delete_admin" ON public.client_payments
  FOR DELETE TO authenticated USING (public.is_admin());

-- ============ DAILY LOGS ============
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hours NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_logs TO authenticated;
GRANT ALL ON public.daily_logs TO service_role;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_select" ON public.daily_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "logs_insert" ON public.daily_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "logs_update_own" ON public.daily_logs
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "logs_delete_own" ON public.daily_logs
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Trigger to auto-update payment status
CREATE OR REPLACE FUNCTION public.recompute_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_client UUID;
  total_worked NUMERIC;
  total_paid NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_client := OLD.client_id;
  ELSE
    target_client := NEW.client_id;
  END IF;

  SELECT COALESCE(SUM(hours), 0) INTO total_worked FROM public.daily_logs WHERE client_id = target_client;
  SELECT COALESCE(SUM(hours_paid), 0) INTO total_paid FROM public.client_payments WHERE client_id = target_client;

  UPDATE public.clients
  SET payment_status = CASE
    WHEN total_paid = 0 AND total_worked = 0 THEN 'paid'::payment_status
    WHEN total_worked > total_paid THEN 'due'::payment_status
    WHEN total_worked = total_paid AND total_paid > 0 THEN 'paid'::payment_status
    ELSE 'partial'::payment_status
  END,
  updated_at = now()
  WHERE id = target_client;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_logs_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.recompute_payment_status();
CREATE TRIGGER trg_payments_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON public.client_payments
  FOR EACH ROW EXECUTE FUNCTION public.recompute_payment_status();

-- ============ CLIENT DOCUMENTS ============
CREATE TABLE public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  doc_type public.doc_type NOT NULL DEFAULT 'free',
  title TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated;
GRANT ALL ON public.client_documents TO service_role;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs_select" ON public.client_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "docs_insert" ON public.client_documents
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "docs_update_own" ON public.client_documents
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "docs_delete_own" ON public.client_documents
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- ============ CLIENT CONTACTS ============
CREATE TABLE public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  role TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contacts TO authenticated;
GRANT ALL ON public.client_contacts TO service_role;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_access" ON public.client_contacts
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
  );

-- ============ CLIENT TASKS ============
CREATE TABLE public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_tasks TO authenticated;
GRANT ALL ON public.client_tasks TO service_role;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON public.client_tasks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "tasks_admin_insert" ON public.client_tasks
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND created_by = auth.uid());
CREATE POLICY "tasks_update_owner_or_admin" ON public.client_tasks
  FOR UPDATE TO authenticated USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "tasks_admin_delete" ON public.client_tasks
  FOR DELETE TO authenticated USING (public.is_admin());

-- ============ LEARNING CENTER ============
CREATE TABLE public.learning_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  icon TEXT DEFAULT 'book',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_categories TO authenticated;
GRANT ALL ON public.learning_categories TO service_role;
ALTER TABLE public.learning_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lc_select_all" ON public.learning_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "lc_admin_manage" ON public.learning_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.learning_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.learning_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_links TO authenticated;
GRANT ALL ON public.learning_links TO service_role;
ALTER TABLE public.learning_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ll_select_all" ON public.learning_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "ll_admin_manage" ON public.learning_links FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ FEEDBACK ============
CREATE TABLE public.feedback_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_tokens TO authenticated;
GRANT SELECT, UPDATE ON public.feedback_tokens TO anon;
GRANT ALL ON public.feedback_tokens TO service_role;
ALTER TABLE public.feedback_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tokens_select_anon" ON public.feedback_tokens FOR SELECT TO anon USING (used = false);
CREATE POLICY "tokens_update_anon" ON public.feedback_tokens FOR UPDATE TO anon USING (used = false);
CREATE POLICY "tokens_select_auth" ON public.feedback_tokens FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
);
CREATE POLICY "tokens_insert_auth" ON public.feedback_tokens FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
);

CREATE TABLE public.feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users(id),
  service_rating INT NOT NULL CHECK (service_rating BETWEEN 1 AND 10),
  professionalism_rating INT NOT NULL CHECK (professionalism_rating BETWEEN 1 AND 10),
  comments TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feedback_responses TO authenticated;
GRANT INSERT ON public.feedback_responses TO anon;
GRANT ALL ON public.feedback_responses TO service_role;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr_insert_anon" ON public.feedback_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "fr_select_auth" ON public.feedback_responses FOR SELECT TO authenticated USING (
  member_user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_admin()))
);

-- ============ INSPIRATION ============
CREATE TABLE public.inspiration_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspiration_posts TO authenticated;
GRANT ALL ON public.inspiration_posts TO service_role;
ALTER TABLE public.inspiration_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insp_select" ON public.inspiration_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "insp_insert" ON public.inspiration_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "insp_update_own" ON public.inspiration_posts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insp_delete_own_or_admin" ON public.inspiration_posts FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
