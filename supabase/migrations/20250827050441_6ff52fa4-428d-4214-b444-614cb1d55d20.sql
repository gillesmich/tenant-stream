-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  avatar_url TEXT,
  user_type TEXT CHECK (user_type IN ('proprietaire', 'locataire', 'admin')) DEFAULT 'proprietaire',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  property_type TEXT CHECK (property_type IN ('appartement', 'maison', 'studio', 'bureau', 'commerce')) NOT NULL,
  surface DECIMAL,
  rooms INTEGER,
  bedrooms INTEGER,
  furnished BOOLEAN DEFAULT false,
  rent_amount DECIMAL NOT NULL,
  charges_amount DECIMAL DEFAULT 0,
  deposit_amount DECIMAL,
  available_date DATE,
  status TEXT CHECK (status IN ('disponible', 'loue', 'maintenance', 'vendu')) DEFAULT 'disponible',
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  occupation TEXT,
  employer TEXT,
  monthly_income DECIMAL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leases table
CREATE TABLE public.leases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  lease_type TEXT CHECK (lease_type IN ('vide', 'meuble')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  rent_amount DECIMAL NOT NULL,
  charges_amount DECIMAL DEFAULT 0,
  deposit_amount DECIMAL,
  status TEXT CHECK (status IN ('brouillon', 'actif', 'expire', 'resilie')) DEFAULT 'brouillon',
  signed_by_tenant BOOLEAN DEFAULT false,
  signed_by_owner BOOLEAN DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rents table
CREATE TABLE public.rents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  rent_amount DECIMAL NOT NULL,
  charges_amount DECIMAL DEFAULT 0,
  total_amount DECIMAL NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('en_attente', 'paye', 'en_retard', 'partiel')) DEFAULT 'en_attente',
  paid_amount DECIMAL DEFAULT 0,
  paid_date DATE,
  payment_method TEXT,
  receipt_sent BOOLEAN DEFAULT false,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  document_type TEXT CHECK (document_type IN ('bail', 'etat_lieux_entree', 'etat_lieux_sortie', 'quittance', 'relance', 'autre')) NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Properties policies
CREATE POLICY "Owners can view their properties" ON public.properties
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their properties" ON public.properties
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their properties" ON public.properties
  FOR DELETE USING (auth.uid() = owner_id);

-- Tenants policies
CREATE POLICY "Owners can view their tenants" ON public.tenants
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert tenants" ON public.tenants
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their tenants" ON public.tenants
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their tenants" ON public.tenants
  FOR DELETE USING (auth.uid() = owner_id);

-- Leases policies
CREATE POLICY "Owners can view their leases" ON public.leases
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert leases" ON public.leases
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their leases" ON public.leases
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their leases" ON public.leases
  FOR DELETE USING (auth.uid() = owner_id);

-- Rents policies
CREATE POLICY "Owners can view their rents" ON public.rents
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert rents" ON public.rents
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their rents" ON public.rents
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their rents" ON public.rents
  FOR DELETE USING (auth.uid() = owner_id);

-- Documents policies
CREATE POLICY "Owners can view their documents" ON public.documents
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their documents" ON public.documents
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their documents" ON public.documents
  FOR DELETE USING (auth.uid() = owner_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rents_updated_at
  BEFORE UPDATE ON public.rents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();