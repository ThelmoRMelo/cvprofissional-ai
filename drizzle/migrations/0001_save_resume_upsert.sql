CREATE OR REPLACE FUNCTION public.save_resume(_token uuid, _client_name text, _client_email text, _client_phone text, _plan text, _template_id uuid, _data jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _id uuid;
BEGIN
  IF _plan IS NOT NULL AND NOT EXISTS (SELECT 1 FROM plans WHERE slug=_plan) THEN RAISE EXCEPTION 'invalid plan'; END IF;
  IF _token IS NULL THEN _token := gen_random_uuid(); END IF;
  UPDATE resumes SET client_name=coalesce(_client_name,client_name), client_email=coalesce(_client_email,client_email),
    client_phone=coalesce(_client_phone,client_phone), plan=coalesce(_plan,plan), template_id=coalesce(_template_id,template_id),
    data=coalesce(_data,data), updated_at=now()
  WHERE access_token=_token RETURNING id INTO _id;
  IF _id IS NULL THEN
    INSERT INTO resumes (access_token, client_name, client_email, client_phone, plan, template_id, data)
    VALUES (_token, coalesce(_client_name,''), coalesce(_client_email,''), coalesce(_client_phone,''), coalesce(_plan,'basico'), _template_id, coalesce(_data,'{}'));
  END IF;
  RETURN _token;
END $function$;