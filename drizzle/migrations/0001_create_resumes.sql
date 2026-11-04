CREATE TABLE public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  client_name text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  client_phone text NOT NULL DEFAULT '',
  plan text NOT NULL DEFAULT 'basico',
  template_id uuid,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_proof_path text,
  download_released boolean NOT NULL DEFAULT false,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read resumes" ON public.resumes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update resumes" ON public.resumes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete resumes" ON public.resumes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Client access via secret token (no login needed)
CREATE OR REPLACE FUNCTION public.save_resume(_token uuid, _client_name text, _client_email text, _client_phone text, _plan text, _template_id uuid, _data jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF _token IS NULL THEN
    INSERT INTO resumes (client_name, client_email, client_phone, plan, template_id, data)
    VALUES (coalesce(_client_name,''), coalesce(_client_email,''), coalesce(_client_phone,''), coalesce(_plan,'basico'), _template_id, coalesce(_data,'{}'))
    RETURNING access_token INTO _token;
    RETURN _token;
  END IF;
  UPDATE resumes SET client_name=coalesce(_client_name,client_name), client_email=coalesce(_client_email,client_email),
    client_phone=coalesce(_client_phone,client_phone), plan=coalesce(_plan,plan), template_id=coalesce(_template_id,template_id),
    data=coalesce(_data,data), updated_at=now()
  WHERE access_token=_token RETURNING id INTO _id;
  IF _id IS NULL THEN RAISE EXCEPTION 'resume not found'; END IF;
  RETURN _token;
END $$;

CREATE OR REPLACE FUNCTION public.set_payment_proof(_token uuid, _path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE resumes SET payment_proof_path=_path, payment_status='awaiting_confirmation', updated_at=now() WHERE access_token=_token;
END $$;

CREATE OR REPLACE FUNCTION public.get_resume_status(_token uuid)
RETURNS TABLE(payment_status text, download_released boolean, data jsonb, plan text, template_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT payment_status, download_released, data, plan, template_id FROM resumes WHERE access_token=_token
$$;

GRANT EXECUTE ON FUNCTION public.save_resume(uuid,text,text,text,text,uuid,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_payment_proof(uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_resume_status(uuid) TO anon, authenticated;

CREATE POLICY "Anyone upload payment proofs" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id='payment-proofs');
CREATE POLICY "Admin read payment proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='payment-proofs' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete payment proofs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='payment-proofs' AND public.has_role(auth.uid(),'admin'));