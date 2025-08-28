-- Create inventories table for property condition reports
CREATE TABLE public.inventories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  property_id UUID,
  inventory_date DATE NOT NULL,
  inventory_type TEXT NOT NULL CHECK (inventory_type IN ('entree', 'sortie')),
  general_comments TEXT,
  rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;

-- Create policies for owner access
CREATE POLICY "Owners can view their inventories" 
ON public.inventories 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create inventories" 
ON public.inventories 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their inventories" 
ON public.inventories 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their inventories" 
ON public.inventories 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inventories_updated_at
BEFORE UPDATE ON public.inventories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for inventory photos
INSERT INTO storage.buckets (id, name, public) VALUES ('inventory-photos', 'inventory-photos', false);

-- Create policies for inventory photo storage
CREATE POLICY "Users can view their own inventory photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own inventory photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own inventory photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own inventory photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);