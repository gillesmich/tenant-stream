-- Create security deposit requests table
CREATE TABLE public.caution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_email TEXT NOT NULL,
  tenant_phone TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  duration_months INTEGER NOT NULL,
  property_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'accepted', 'paid', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Create tenant profiles table for security deposit process
CREATE TABLE public.tenant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  caution_request_id UUID REFERENCES public.caution_requests(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F', 'Other')),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'France',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'email_verified', 'phone_verified', 'fully_verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create 2FA codes table
CREATE TABLE public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_profile_id UUID NOT NULL REFERENCES public.tenant_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payments table for Stripe integration
CREATE TABLE public.caution_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caution_request_id UUID NOT NULL REFERENCES public.caution_requests(id) ON DELETE CASCADE,
  tenant_profile_id UUID NOT NULL REFERENCES public.tenant_profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reserved', 'captured', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.caution_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caution_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for caution_requests
CREATE POLICY "Owners can view their own caution requests" ON public.caution_requests
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can create caution requests" ON public.caution_requests
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their own caution requests" ON public.caution_requests
  FOR UPDATE USING (owner_id = auth.uid());

-- RLS Policies for tenant_profiles
CREATE POLICY "Tenants can view their own profile" ON public.tenant_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Tenants can create their own profile" ON public.tenant_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Tenants can update their own profile" ON public.tenant_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for verification_codes
CREATE POLICY "Tenants can view their own verification codes" ON public.verification_codes
  FOR SELECT USING (
    tenant_profile_id IN (
      SELECT id FROM public.tenant_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for caution_payments
CREATE POLICY "Tenants can view their own payments" ON public.caution_payments
  FOR SELECT USING (
    tenant_profile_id IN (
      SELECT id FROM public.tenant_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can view payments for their caution requests" ON public.caution_payments
  FOR SELECT USING (
    caution_request_id IN (
      SELECT id FROM public.caution_requests WHERE owner_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_caution_requests_updated_at
  BEFORE UPDATE ON public.caution_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_profiles_updated_at
  BEFORE UPDATE ON public.tenant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caution_payments_updated_at
  BEFORE UPDATE ON public.caution_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();