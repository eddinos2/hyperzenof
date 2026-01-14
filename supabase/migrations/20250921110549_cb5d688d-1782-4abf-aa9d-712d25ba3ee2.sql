-- Create user roles enum
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'COMPTABLE', 'DIRECTEUR_CAMPUS', 'ENSEIGNANT');

-- Create invoice status enum  
CREATE TYPE invoice_status AS ENUM ('pending', 'prevalidated', 'validated', 'paid', 'rejected');

-- Create payment method enum
CREATE TYPE payment_method AS ENUM ('virement', 'cheque', 'especes', 'autre');

-- Create campus table
CREATE TABLE public.campus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create filiere (BTS programs) table
CREATE TABLE public.filiere (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  pole TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campus_filiere association table
CREATE TABLE public.campus_filiere (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id UUID NOT NULL REFERENCES public.campus(id) ON DELETE CASCADE,
  filiere_id UUID NOT NULL REFERENCES public.filiere(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campus_id, filiere_id)
);

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'ENSEIGNANT',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  campus_id UUID REFERENCES public.campus(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teacher_profile table for additional teacher info
CREATE TABLE public.teacher_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  specialities TEXT[] DEFAULT '{}',
  hourly_rate_min DECIMAL(8,2) DEFAULT 50.00,
  hourly_rate_max DECIMAL(8,2) DEFAULT 80.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class table
CREATE TABLE public.class (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  filiere_id UUID NOT NULL REFERENCES public.filiere(id),
  campus_id UUID NOT NULL REFERENCES public.campus(id),
  year INTEGER NOT NULL CHECK (year >= 1 AND year <= 3),
  group_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(label, campus_id, year)
);

-- Create invoice table
CREATE TABLE public.invoice (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  campus_id UUID NOT NULL REFERENCES public.campus(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  status invoice_status NOT NULL DEFAULT 'pending',
  total_ht DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_ttc DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, month, year, campus_id)
);

-- Create invoice_line table
CREATE TABLE public.invoice_line (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours_qty DECIMAL(4,2) NOT NULL CHECK (hours_qty > 0),
  unit_price DECIMAL(8,2) NOT NULL CHECK (unit_price > 0),
  filiere_id UUID NOT NULL REFERENCES public.filiere(id),
  class_id UUID REFERENCES public.class(id),
  campus_id UUID NOT NULL REFERENCES public.campus(id),
  course_title TEXT NOT NULL,
  is_late BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create validation_log table for audit trail
CREATE TABLE public.validation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  role user_role NOT NULL,
  action TEXT NOT NULL,
  comment TEXT,
  previous_status invoice_status,
  new_status invoice_status,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment table
CREATE TABLE public.payment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount_ttc DECIMAL(10,2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'virement',
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_trail table for comprehensive logging
CREATE TABLE public.audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  payload JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.campus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filiere ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_filiere ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Campus policies
CREATE POLICY "Campus viewable by all authenticated users" ON public.campus
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Campus manageable by super admin" ON public.campus
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Filiere policies  
CREATE POLICY "Filiere viewable by all authenticated users" ON public.filiere
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Filiere manageable by super admin" ON public.filiere
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Campus_filiere policies
CREATE POLICY "Campus filiere viewable by all authenticated users" ON public.campus_filiere
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Campus filiere manageable by super admin" ON public.campus_filiere
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Campus directors can view profiles in their campus" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'DIRECTEUR_CAMPUS' 
      AND p.campus_id = profiles.campus_id
    )
  );

CREATE POLICY "Comptables can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'COMPTABLE'
    )
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Teacher profile policies
CREATE POLICY "Teachers can manage their own teacher profile" ON public.teacher_profile
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all teacher profiles" ON public.teacher_profile
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Campus directors can view teacher profiles in their campus" ON public.teacher_profile
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p2.user_id = teacher_profile.user_id
      WHERE p1.user_id = auth.uid() 
      AND p1.role = 'DIRECTEUR_CAMPUS' 
      AND p1.campus_id = p2.campus_id
    )
  );

-- Class policies
CREATE POLICY "Classes viewable by authenticated users" ON public.class
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Classes manageable by super admin and campus directors" ON public.class
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'SUPER_ADMIN' OR (role = 'DIRECTEUR_CAMPUS' AND campus_id = class.campus_id))
    )
  );

-- Invoice policies
CREATE POLICY "Teachers can manage their own invoices" ON public.invoice
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Campus directors can view invoices in their campus" ON public.invoice
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'DIRECTEUR_CAMPUS' 
      AND campus_id = invoice.campus_id
    )
  );

CREATE POLICY "Campus directors can update invoices in their campus" ON public.invoice
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'DIRECTEUR_CAMPUS' 
      AND campus_id = invoice.campus_id
    )
  );

CREATE POLICY "Comptables can view and update all invoices" ON public.invoice
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'COMPTABLE'
    )
  );

CREATE POLICY "Super admins can manage all invoices" ON public.invoice
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Invoice line policies (inherit from invoice)
CREATE POLICY "Invoice lines follow invoice permissions" ON public.invoice_line
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = invoice_line.invoice_id
      AND (
        i.teacher_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
          AND (
            p.role = 'SUPER_ADMIN' OR
            p.role = 'COMPTABLE' OR
            (p.role = 'DIRECTEUR_CAMPUS' AND p.campus_id = i.campus_id)
          )
        )
      )
    )
  );

-- Validation log policies
CREATE POLICY "Validation logs viewable based on invoice access" ON public.validation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = validation_log.invoice_id
      AND (
        i.teacher_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
          AND (
            p.role = 'SUPER_ADMIN' OR
            p.role = 'COMPTABLE' OR
            (p.role = 'DIRECTEUR_CAMPUS' AND p.campus_id = i.campus_id)
          )
        )
      )
    )
  );

CREATE POLICY "Validation logs insertable by authorized users" ON public.validation_log
  FOR INSERT WITH CHECK (
    actor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'COMPTABLE', 'DIRECTEUR_CAMPUS')
    )
  );

-- Payment policies
CREATE POLICY "Payments viewable by comptables and super admins" ON public.payment
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'COMPTABLE')
    )
  );

CREATE POLICY "Payments manageable by comptables" ON public.payment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'COMPTABLE'
    )
  );

-- Audit trail policies  
CREATE POLICY "Audit trail viewable by super admins" ON public.audit_trail
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Audit trail insertable by all authenticated users" ON public.audit_trail
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_campus_updated_at BEFORE UPDATE ON public.campus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_filiere_updated_at BEFORE UPDATE ON public.filiere FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teacher_profile_updated_at BEFORE UPDATE ON public.teacher_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_updated_at BEFORE UPDATE ON public.class FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoice_updated_at BEFORE UPDATE ON public.invoice FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoice_line_updated_at BEFORE UPDATE ON public.invoice_line FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_campus_id ON public.profiles(campus_id);
CREATE INDEX idx_invoice_teacher_id ON public.invoice(teacher_id);
CREATE INDEX idx_invoice_campus_id ON public.invoice(campus_id);
CREATE INDEX idx_invoice_status ON public.invoice(status);
CREATE INDEX idx_invoice_month_year ON public.invoice(month, year);
CREATE INDEX idx_invoice_line_invoice_id ON public.invoice_line(invoice_id);
CREATE INDEX idx_invoice_line_date ON public.invoice_line(date);
CREATE INDEX idx_validation_log_invoice_id ON public.validation_log(invoice_id);
CREATE INDEX idx_payment_invoice_id ON public.payment(invoice_id);
CREATE INDEX idx_audit_trail_user_id ON public.audit_trail(user_id);
CREATE INDEX idx_audit_trail_created_at ON public.audit_trail(created_at);