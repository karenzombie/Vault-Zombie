-- Legal acceptance evidence must remain immutable, including after account anonymization.
CREATE OR REPLACE FUNCTION prevent_legal_consent_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'legal_consents is append-only';
END;
$$;

DROP TRIGGER IF EXISTS legal_consents_no_update ON legal_consents;
CREATE TRIGGER legal_consents_no_update
BEFORE UPDATE ON legal_consents
FOR EACH ROW EXECUTE FUNCTION prevent_legal_consent_mutation();

DROP TRIGGER IF EXISTS legal_consents_no_delete ON legal_consents;
CREATE TRIGGER legal_consents_no_delete
BEFORE DELETE ON legal_consents
FOR EACH ROW EXECUTE FUNCTION prevent_legal_consent_mutation();