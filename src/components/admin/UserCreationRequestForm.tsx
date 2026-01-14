import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const requestSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  role: z.enum(['ENSEIGNANT', 'DIRECTEUR_CAMPUS'], {
    required_error: 'Le rôle est requis'
  }),
  justification: z.string().min(10, 'Veuillez justifier votre demande (minimum 10 caractères)')
});

type RequestFormData = z.infer<typeof requestSchema>;

interface UserCreationRequestFormProps {
  onSuccess?: () => void;
}

export function UserCreationRequestForm({ onSuccess }: UserCreationRequestFormProps) {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      role: 'ENSEIGNANT'
    }
  });

  const onSubmit = async (data: RequestFormData) => {
    if (!profile?.campus_id) {
      toast.error('Campus non défini');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_creation_requests')
        .insert({
          campus_id: profile.campus_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone || null,
          role: data.role,
          justification: data.justification,
          requested_by: profile.user_id
        });

      if (error) throw error;

      toast.success('Demande de création d\'utilisateur envoyée');
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Erreur lors de la création de la demande:', error);
      toast.error('Erreur lors de la création de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BrutalCard>
      <BrutalCardHeader>
        <BrutalCardTitle className="flex items-center">
          <UserPlus className="h-5 w-5 mr-2" />
          Demander la création d'un nouvel utilisateur
        </BrutalCardTitle>
      </BrutalCardHeader>
      <BrutalCardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Prénom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemple.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="01 23 45 67 89" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ENSEIGNANT">Enseignant</SelectItem>
                        <SelectItem value="DIRECTEUR_CAMPUS">Directeur Campus</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification de la demande</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Expliquez pourquoi ce nouvel utilisateur est nécessaire pour votre campus..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <BrutalButton
                type="submit"
                disabled={isSubmitting}
                className="bg-brand-success hover:bg-brand-success/90"
              >
                {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
              </BrutalButton>
            </div>
          </form>
        </Form>
      </BrutalCardContent>
    </BrutalCard>
  );
}