-- Intent evidence may only be consumed once. Legal facts and token identifiers never change.
CREATE OR REPLACE FUNCTION prevent_legal_signup_intent_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'legal_signup_intents may not be deleted'; END;
$$;
CREATE OR REPLACE FUNCTION enforce_legal_signup_intent_lifecycle()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.nonce <> NEW.nonce OR OLD.token_hash <> NEW.token_hash
    OR OLD.terms_version <> NEW.terms_version OR OLD.privacy_version <> NEW.privacy_version
    OR OLD.accepted_at <> NEW.accepted_at OR OLD.expires_at <> NEW.expires_at
    OR OLD.created_at <> NEW.created_at
    OR OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
    OR NEW.consumed_clerk_subject IS NULL THEN
    RAISE EXCEPTION 'legal_signup_intents may only transition once to consumed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS legal_signup_intents_consume_only ON legal_signup_intents;
CREATE TRIGGER legal_signup_intents_consume_only BEFORE UPDATE ON legal_signup_intents
FOR EACH ROW EXECUTE FUNCTION enforce_legal_signup_intent_lifecycle();
DROP TRIGGER IF EXISTS legal_signup_intents_no_delete ON legal_signup_intents;
CREATE TRIGGER legal_signup_intents_no_delete BEFORE DELETE ON legal_signup_intents
FOR EACH ROW EXECUTE FUNCTION prevent_legal_signup_intent_delete();