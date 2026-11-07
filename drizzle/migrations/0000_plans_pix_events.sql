CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'BRL',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active plans" ON public.plans FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage plans" ON public.plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.plans (slug,name,price_cents,sort_order) VALUES
 ('basico','Básico',200,1),('intermediario','Intermediário',300,2),('profissional','Profissional',500,3);

CREATE TABLE public.pix_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  recipient_name text NOT NULL DEFAULT '',
  pix_key text NOT NULL DEFAULT '',
  qr_code_object_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_configs TO authenticated;
GRANT ALL ON public.pix_configs TO service_role;
ALTER TABLE public.pix_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage pix" ON public.pix_configs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  old_status text,
  new_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read events" ON public.order_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.resumes ADD COLUMN amount_cents integer;
ALTER TABLE public.resumes ADD COLUMN approved_by uuid;
ALTER TABLE public.resumes ADD COLUMN approved_at timestamptz;
ALTER TABLE public.resumes ADD COLUMN released_at timestamptz;

-- Checkout: returns pix data + server price for a resume token
CREATE OR REPLACE FUNCTION public.get_checkout(_token uuid)
RETURNS TABLE(amount_cents integer, recipient_name text, pix_key text, qr_code_object_path text, payment_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.price_cents, c.recipient_name, c.pix_key, c.qr_code_object_path, r.payment_status
  FROM resumes r JOIN plans p ON p.slug = r.plan AND p.is_active
  LEFT JOIN pix_configs c ON c.plan_id = p.id AND c.is_active
  WHERE r.access_token = _token LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_checkout(uuid) TO anon, authenticated;

-- Snapshot price on save
CREATE OR REPLACE FUNCTION public.snapshot_resume_price() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'pending' THEN
    SELECT price_cents INTO NEW.amount_cents FROM plans WHERE slug = NEW.plan;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_snapshot_resume_price BEFORE INSERT OR UPDATE OF plan ON public.resumes
FOR EACH ROW EXECUTE FUNCTION public.snapshot_resume_price();

-- Admin audited actions
CREATE OR REPLACE FUNCTION public.admin_set_payment(_resume_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old text; _new text := CASE WHEN _approve THEN 'approved' ELSE 'rejected' END;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT payment_status INTO _old FROM resumes WHERE id=_resume_id FOR UPDATE;
  UPDATE resumes SET payment_status=_new, approved_by=auth.uid(), approved_at=now(), updated_at=now() WHERE id=_resume_id;
  INSERT INTO order_events(resume_id,actor_id,action,old_status,new_status) VALUES (_resume_id,auth.uid(),'payment',_old,_new);
END $$;

CREATE OR REPLACE FUNCTION public.admin_release_download(_resume_id uuid, _release boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _release AND NOT EXISTS (SELECT 1 FROM resumes WHERE id=_resume_id AND payment_status='approved') THEN
    RAISE EXCEPTION 'payment not approved';
  END IF;
  UPDATE resumes SET download_released=_release, released_at=CASE WHEN _release THEN now() END, updated_at=now() WHERE id=_resume_id;
  INSERT INTO order_events(resume_id,actor_id,action,new_status) VALUES (_resume_id,auth.uid(),'release',_release::text);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_payment(uuid,boolean), public.admin_release_download(uuid,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_payment(uuid,boolean), public.admin_release_download(uuid,boolean) TO authenticated;