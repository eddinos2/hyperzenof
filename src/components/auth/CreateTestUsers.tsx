import React, { useState } from 'react';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const testUsers = [
  {
    email: 'admin@hyperzenof.demo',
    password: 'admin123',
    first_name: 'Super',
    last_name: 'Admin',
    role: 'SUPER_ADMIN',
    campus_id: null,
  },
  {
    email: 'comptable@hyperzenof.demo', 
    password: 'compta123',
    first_name: 'Marie',
    last_name: 'Dubois',
    role: 'COMPTABLE',
    campus_id: null,
  },
  {
    email: 'directeur.roquette@hyperzenof.demo',
    password: 'dir123',
    first_name: 'Pierre',
    last_name: 'Martin',
    role: 'DIRECTEUR_CAMPUS',
    campus_name: 'Roquette',
  },
  {
    email: 'prof.dupont@hyperzenof.demo',
    password: 'prof123',
    first_name: 'Jean',
    last_name: 'Dupont',
    role: 'ENSEIGNANT',
    campus_name: 'Roquette',
  },
  {
    email: 'prof.bernard@hyperzenof.demo',
    password: 'prof123',
    first_name: 'Sophie',
    last_name: 'Bernard',
    role: 'ENSEIGNANT',
    campus_name: 'Picpus',
  },
];

export function CreateTestUsers() {
  const [creating, setCreating] = useState(false);

  const createTestUsers = async () => {
    setCreating(true);
    const errors: string[] = [];
    
    try {
      // Get campus IDs
      const { data: campusData } = await supabase
        .from('campus')
        .select('id, name');

      const campusMap = campusData?.reduce((acc, campus) => {
        acc[campus.name] = campus.id;
        return acc;
      }, {} as Record<string, string>) || {};

      for (const user of testUsers) {
        const campus_id = user.campus_name ? campusMap[user.campus_name] : null;
        
        // Create user in Supabase Auth (using standard signup)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            data: {
              first_name: user.first_name,
              last_name: user.last_name,
              role: user.role
            }
          }
        });

        if (authError) {
          console.error(`Error creating user ${user.email}:`, authError);
          errors.push(`${user.email}: ${authError.message}`);
          continue;
        }

        if (!authData.user) {
          console.error(`No user returned for ${user.email}`);
          errors.push(`${user.email}: No user data returned`);
          continue;
        }

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role as 'SUPER_ADMIN' | 'COMPTABLE' | 'DIRECTEUR_CAMPUS' | 'ENSEIGNANT',
            campus_id,
          });

        if (profileError) {
          console.error(`Error creating profile for ${user.email}:`, profileError);
          continue;
        }

        // Create teacher profile if needed
        if (user.role === 'ENSEIGNANT') {
          await supabase
            .from('teacher_profile')
            .insert({
              user_id: authData.user.id,
              specialities: ['Informatique', 'Web', 'Programmation'],
              hourly_rate_min: 55.00,
              hourly_rate_max: 75.00,
            });
        }

        // User profile loaded successfully
      }

      if (errors.length > 0) {
        toast.error(`Erreurs: ${errors.join(', ')}`);
      } else {
        toast.success('Utilisateurs de test créés avec succès!');
      }
    } catch (error) {
      console.error('Error creating test users:', error);
      toast.error('Erreur lors de la création des utilisateurs de test');
    } finally {
      setCreating(false);
    }
  };

  return (
    <BrutalCard className="max-w-md mx-auto mt-8">
      <BrutalCardHeader>
        <BrutalCardTitle>Créer des utilisateurs de test</BrutalCardTitle>
      </BrutalCardHeader>
      <BrutalCardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Créer des comptes de test pour tester l'application avec différents rôles.
          </p>
          
          <div className="space-y-2">
            {testUsers.map((user, index) => (
              <div key={index} className="p-2 border border-border-light rounded text-sm">
                <div className="font-medium">{user.first_name} {user.last_name}</div>
                <div className="text-muted-foreground">{user.email} - {user.role}</div>
              </div>
            ))}
          </div>
          
          <BrutalButton 
            onClick={createTestUsers} 
            disabled={creating}
            className="w-full"
            variant="success"
          >
            {creating ? 'Création...' : 'Créer les utilisateurs'}
          </BrutalButton>
        </div>
      </BrutalCardContent>
    </BrutalCard>
  );
}