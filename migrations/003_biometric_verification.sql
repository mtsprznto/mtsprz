ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS face_match_score FLOAT;
ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS liveness_passed BOOLEAN DEFAULT false;
ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS rut_valid BOOLEAN DEFAULT false;
ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS mrz_valid BOOLEAN DEFAULT false;
ALTER TABLE id_verifications ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending','passed','failed'));
