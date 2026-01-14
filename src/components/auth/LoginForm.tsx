import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from './AuthProvider';
import { BrutalCard, BrutalCardContent, BrutalCardDescription, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoAurlomBts from '@/assets/logo-aurlom-bts.png';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Obtenir le token reCAPTCHA
      const recaptchaToken = await recaptchaRef.current?.executeAsync();
      
      if (!recaptchaToken) {
        toast.error('Erreur de sécurité', {
          description: 'Veuillez réessayer'
        });
        setLoading(false);
        return;
      }

      // Réinitialiser reCAPTCHA pour la prochaine tentative
      recaptchaRef.current?.reset();

      // Appeler notre edge function sécurisée
      const { data, error } = await supabase.functions.invoke('verify-login', {
        body: {
          email,
          password,
          recaptchaToken
        }
      });

      if (error || !data.success) {
        const errorMsg = data?.error || error?.message || 'Erreur de connexion';
        
        if (data?.blocked) {
          setIsBlocked(true);
          toast.error('Compte bloqué', {
            description: 'Trop de tentatives. Réessayez dans 15 minutes.',
            duration: 8000
          });
        } else {
          toast.error('Erreur de connexion', {
            description: errorMsg
          });
        }
      } else {
        // Connexion réussie - définir la session manuellement
        await supabase.auth.setSession(data.session);
        toast.success('Connexion réussie');
        setIsBlocked(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erreur technique', {
        description: 'Veuillez réessayer plus tard'
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={logoAurlomBts} 
              alt="AURLOM BTS+" 
              className="w-64 h-auto"
            />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Powered by <span className="font-bold text-brand-aurlom">Hyperzen</span>
          </p>
          <p className="text-lg text-muted-foreground mt-2">Système de Gestion Scolaire</p>
        </div>

        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle>Connexion</BrutalCardTitle>
            <BrutalCardDescription>
              Connectez-vous à votre compte pour accéder au système
            </BrutalCardDescription>
          </BrutalCardHeader>
          
          <BrutalCardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <BrutalInput
                  id="email"
                  type="email"
                  placeholder="votre.email@aurlom-bts.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </Label>
                <div className="relative">
                  <BrutalInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* reCAPTCHA invisible */}
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  size="invisible"
                  sitekey="6LdkaNIrAAAAAL0Tt59w7hIHm0zMAMdy0YpH2p3E"
                />
              </div>

              <BrutalButton 
                type="submit" 
                className="w-full" 
                size="lg"
                variant="aurlom"
                disabled={loading}
              >
                <Shield className="w-4 h-4 mr-2" />
                {loading ? 'Vérification sécurisée...' : 'Se connecter'}
              </BrutalButton>

              {isBlocked && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium text-center">
                    ⚠️ Compte temporairement bloqué pour sécurité
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Réessayez dans 15 minutes
                  </p>
                </div>
              )}
            </form>
          </BrutalCardContent>
        </BrutalCard>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Système de gestion des factures professeurs
          </p>
          <p className="text-xs text-muted-foreground">
            © 2024 Hyperzen - Module Profs développé par DSI AURLOM BTS+
          </p>
        </div>
      </div>
    </div>
  );
}