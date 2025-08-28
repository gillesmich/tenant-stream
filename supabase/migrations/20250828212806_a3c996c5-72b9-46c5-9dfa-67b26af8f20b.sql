-- Ensure invalid references are nulled before adding FK
UPDATE public.inventories i
SET property_id = NULL
WHERE property_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.properties p WHERE p.id = i.property_id
);

-- Add FK relationship so PostgREST can resolve inventories -> properties
ALTER TABLE public.inventories
ADD CONSTRAINT inventories_property_id_fkey
FOREIGN KEY (property_id)
REFERENCES public.properties(id)
ON DELETE SET NULL;

-- Helpful index for joins and lookups
CREATE INDEX IF NOT EXISTS idx_inventories_property_id
ON public.inventories(property_id);