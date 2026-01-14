import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Campus {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
}

export interface Filiere {
  id: string;
  code: string;
  label: string;
  pole: string;
  is_active: boolean;
}

export interface CourseTitle {
  id: string;
  title: string;
  category: string | null;
  is_active: boolean;
}

export interface Class {
  id: string;
  group_code: string;
  label: string;
  year: number;
  campus_id: string;
  filiere_id: string;
  is_active: boolean;
}

export const useCampuses = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const { data, error } = await supabase
          .from('campus')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setCampuses(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchCampuses();
  }, []);

  return { campuses, loading, error };
};

export const useFilieres = () => {
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFilieres = async () => {
      try {
        const { data, error } = await supabase
          .from('filiere')
          .select('*')
          .eq('is_active', true)
          .order('code');

        if (error) throw error;
        setFilieres(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchFilieres();
  }, []);

  return { filieres, loading, error };
};

export const useCourseTitles = () => {
  const [courseTitles, setCourseTitles] = useState<CourseTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Données temporaires hardcodées en attendant la mise à jour des types
    const hardcodedCourses: CourseTitle[] = [
      { id: '1', title: 'ANGLAIS', category: 'Langues', is_active: true },
      { id: '2', title: 'COMMUNICATION PROFESSIONNELLE', category: 'Communication', is_active: true },
      { id: '3', title: 'COMPTABILITÉ', category: 'Comptabilité', is_active: true },
      { id: '4', title: 'GESTION DE PROJET', category: 'Management', is_active: true },
      { id: '5', title: 'MATHÉMATIQUES', category: 'Sciences', is_active: true },
      { id: '6', title: 'ÉCONOMIE ET GESTION', category: 'Gestion', is_active: true },
      { id: '7', title: 'CULTURE GÉNÉRALE & EXPRESSION', category: 'Culture', is_active: true },
      { id: '8', title: 'DÉVELOPPEMENT COMMERCIAL', category: 'Commerce', is_active: true },
      { id: '9', title: 'RELATION CLIENT ET NÉGOCIATION-VENTE', category: 'Commerce', is_active: true },
      { id: '10', title: 'GESTION DE LA RELATION CLIENTÈLE TOURISTIQUE', category: 'Tourisme', is_active: true }
    ];
    
    setTimeout(() => {
      setCourseTitles(hardcodedCourses);
      setLoading(false);
    }, 100);
  }, []);

  return { courseTitles, loading, error };
};

export const useClasses = (campusId?: string) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        let query = supabase
          .from('class')
          .select('*')
          .eq('is_active', true)
          .order('label');

        if (campusId) {
          query = query.eq('campus_id', campusId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setClasses(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [campusId]);

  return { classes, loading, error };
};