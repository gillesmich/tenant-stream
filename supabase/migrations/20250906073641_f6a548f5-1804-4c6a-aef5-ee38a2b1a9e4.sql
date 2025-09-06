-- Allow template document types used by the app
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_document_type_check;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_document_type_check 
CHECK (document_type = ANY (ARRAY[
  'bail'::text,
  'etat_lieux_entree'::text,
  'etat_lieux_sortie'::text,
  'quittance'::text,
  'quittance_loyer'::text,
  'relance'::text,
  'autre'::text,
  'lease_template'::text,
  'receipt_template'::text
]));