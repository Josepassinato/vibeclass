import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface StudentProfile {
  id: string;
  student_id: string;
  name: string | null;
  learning_style: string | null;
  strengths: string[];
  areas_to_improve: string[];
  preferences: Record<string, any>;
  personality_notes: string | null;
  interaction_count: number | null;
  total_study_time_minutes: number | null;
  last_seen_at: string | null;
}

export interface StudentObservation {
  observation_type: 'comprehension' | 'engagement' | 'behavior';
  observation_data: Record<string, any>;
  context?: string;
  video_id?: string;
}

interface UseStudentMemoryOptions {
  onProfileLoaded?: (profile: StudentProfile) => void;
  onObservationRecorded?: (observation: StudentObservation) => void;
}

// Generate a unique student ID based on auth user or browser fingerprint
async function getOrCreateStudentId(): Promise<string> {
  // First, try to get the authenticated user ID
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Use auth user ID for persistent memory across devices
    const authBasedId = `auth_${user.id}`;
    localStorage.setItem('student_id', authBasedId);
    return authBasedId;
  }
  
  // Fallback to browser fingerprint for non-authenticated users
  const stored = localStorage.getItem('student_id');
  if (stored) return stored;
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const id = `student_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  localStorage.setItem('student_id', id);
  return id;
}

export function useStudentMemory(options: UseStudentMemoryOptions = {}) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const sessionStartRef = useRef(Date.now());
  const optionsRef = useRef(options);
  const initializedRef = useRef(false);
  
  useEffect(() => {
    optionsRef.current = options;
  });

  // Initialize student ID (async because it may need to check auth)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    getOrCreateStudentId().then(id => {
      logger.debug('[StudentMemory] Student ID initialized:', id);
      setStudentId(id);
    });
  }, []);

  // Load or create student profile
  const loadProfile = useCallback(async () => {
    if (!studentId) {
      logger.debug('[StudentMemory] Waiting for studentId...');
      return;
    }
    
    try {
      setIsLoading(true);
      logger.debug('[StudentMemory] Loading profile for:', studentId);
      
      // Try to get existing profile
      const { data: existing, error: fetchError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      
      if (existing) {
        logger.debug('[StudentMemory] Found existing profile:', existing.id, 'name:', existing.name);
        const profileData: StudentProfile = {
          ...existing,
          strengths: existing.strengths || [],
          areas_to_improve: existing.areas_to_improve || [],
          preferences: (existing.preferences as unknown as Record<string, any>) || {},
        };
        setProfile(profileData);
        optionsRef.current.onProfileLoaded?.(profileData);
        
        // Update last seen
        await supabase
          .from('student_profiles')
          .update({ 
            last_seen_at: new Date().toISOString(),
            interaction_count: (existing.interaction_count || 0) + 1
          })
          .eq('id', existing.id);
      } else {
        logger.debug('[StudentMemory] Creating new profile for:', studentId);
        // Create new profile
        const { data: newProfile, error: insertError } = await supabase
          .from('student_profiles')
          .insert({
            student_id: studentId,
            interaction_count: 1,
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        logger.debug('[StudentMemory] Created new profile:', newProfile.id);
        const profileData: StudentProfile = {
          ...newProfile,
          strengths: [],
          areas_to_improve: [],
          preferences: {},
        };
        setProfile(profileData);
        optionsRef.current.onProfileLoaded?.(profileData);
      }
    } catch (error) {
      logger.error('[StudentMemory] Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  // Record an observation
  const recordObservation = useCallback(async (observation: StudentObservation) => {
    if (!profile || !studentId) {
      logger.warn('[StudentMemory] Cannot record observation - profile or studentId missing');
      return;
    }
    
    try {
      logger.debug('[StudentMemory] Recording observation:', observation.observation_type, observation.context);
      const { error } = await supabase
        .from('student_observations')
        .insert({
          student_id: studentId,
          video_id: observation.video_id,
          observation_type: observation.observation_type,
          observation_data: observation.observation_data,
          context: observation.context,
        });
      
      if (error) throw error;
      
      logger.debug('[StudentMemory] ✅ Observation recorded successfully');
      optionsRef.current.onObservationRecorded?.(observation);
    } catch (error) {
      logger.error('[StudentMemory] Error recording observation:', error);
    }
  }, [profile, studentId]);

  // Update student profile with new learnings
  const updateProfile = useCallback(async (updates: Partial<Pick<StudentProfile, 'name' | 'learning_style' | 'strengths' | 'areas_to_improve' | 'preferences' | 'personality_notes'>>) => {
    if (!profile) {
      logger.warn('[StudentMemory] Cannot update profile - profile not loaded');
      return;
    }
    
    try {
      logger.debug('[StudentMemory] Updating profile with:', updates);
      const { error } = await supabase
        .from('student_profiles')
        .update(updates)
        .eq('id', profile.id);
      
      if (error) throw error;
      
      logger.debug('[StudentMemory] ✅ Profile updated successfully');
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      logger.error('[StudentMemory] Error updating profile:', error);
    }
  }, [profile]);

  // Get recent observations for context
  const getRecentObservations = useCallback(async (limit = 20): Promise<StudentObservation[]> => {
    if (!studentId) return [];
    try {
      const { data, error } = await supabase
        .from('student_observations')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return (data || []).map(obs => ({
        observation_type: obs.observation_type as StudentObservation['observation_type'],
        observation_data: obs.observation_data as Record<string, any>,
        context: obs.context || undefined,
        video_id: obs.video_id || undefined,
      }));
    } catch (error) {
      logger.error('[StudentMemory] Error getting observations:', error);
      return [];
    }
  }, [studentId]);

  // Build context string for AI prompt
  const buildMemoryContext = useCallback(async (): Promise<string> => {
    if (!profile) return '';
    
    let context = `
MEMÓRIA DO ALUNO:
- ID: ${profile.student_id}
- Nome: ${profile.name || 'Não informado'}
- Estilo de aprendizagem: ${profile.learning_style || 'Ainda não identificado'}
- Total de interações: ${profile.interaction_count}
- Tempo total de estudo: ${profile.total_study_time_minutes} minutos
`;

    if (profile.strengths?.length) {
      context += `- Pontos fortes: ${profile.strengths.join(', ')}\n`;
    }
    
    if (profile.areas_to_improve?.length) {
      context += `- Áreas a melhorar: ${profile.areas_to_improve.join(', ')}\n`;
    }
    
    if (profile.personality_notes) {
      context += `- Observações: ${profile.personality_notes}\n`;
    }

    return context;
  }, [profile]);

  // Update study time on unmount
  useEffect(() => {
    return () => {
      if (profile) {
        const sessionMinutes = Math.floor((Date.now() - sessionStartRef.current) / 60000);
        if (sessionMinutes > 0) {
          supabase
            .from('student_profiles')
            .update({ 
              total_study_time_minutes: (profile.total_study_time_minutes || 0) + sessionMinutes 
            })
            .eq('id', profile.id)
            .then(() => logger.debug('[StudentMemory] Updated study time'));
        }
      }
    };
  }, [profile]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    isLoading,
    studentId,
    recordObservation,
    updateProfile,
    getRecentObservations,
    buildMemoryContext,
    loadProfile,
  };
}
