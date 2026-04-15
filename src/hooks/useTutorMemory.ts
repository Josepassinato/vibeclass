import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * useTutorMemory — Manages long-term memory for the voice tutor.
 *
 * Responsibilities:
 * 1. Fetches consolidated memory context from the tutor-memory edge function
 * 2. Buffers and periodically persists conversation messages
 * 3. Refreshes memory context mid-session (every 5 minutes)
 * 4. Triggers learning pattern analysis on session end
 */

interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  video_timestamp_seconds?: number;
  timestamp: number; // Date.now()
}

interface UseTutorMemoryOptions {
  studentId: string | null;
  videoDbId?: string;
  /** Called when memory context is refreshed */
  onContextRefreshed?: (context: string) => void;
}

// Flush messages to DB every 30 seconds or when buffer hits 10 messages
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_THRESHOLD = 10;
// Refresh memory context every 5 minutes
const CONTEXT_REFRESH_INTERVAL_MS = 5 * 60_000;

export function useTutorMemory({ studentId, videoDbId, onContextRefreshed }: UseTutorMemoryOptions) {
  const [memoryContext, setMemoryContext] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const messageBufferRef = useRef<TutorMessage[]>([]);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef({ studentId, videoDbId, onContextRefreshed });

  useEffect(() => {
    optionsRef.current = { studentId, videoDbId, onContextRefreshed };
  });

  // Fetch memory context from edge function
  const fetchMemoryContext = useCallback(async (): Promise<string> => {
    const sid = optionsRef.current.studentId;
    if (!sid) return '';

    try {
      setIsLoading(true);
      logger.debug('[TutorMemory] Fetching context for', sid);

      const { data, error } = await supabase.functions.invoke('tutor-memory', {
        body: {
          action: 'get_context',
          student_id: sid,
          video_id: optionsRef.current.videoDbId || null,
        },
      });

      if (error) throw error;

      const context = data?.context || '';
      logger.debug('[TutorMemory] Context received:', context.length, 'chars');
      setMemoryContext(context);
      optionsRef.current.onContextRefreshed?.(context);
      return context;
    } catch (err) {
      logger.error('[TutorMemory] Error fetching context:', err);
      return '';
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Flush buffered messages to DB
  const flushMessages = useCallback(async () => {
    const sid = optionsRef.current.studentId;
    if (!sid || messageBufferRef.current.length === 0) return;

    const messages = [...messageBufferRef.current];
    messageBufferRef.current = [];

    try {
      logger.debug('[TutorMemory] Flushing', messages.length, 'messages to DB');
      const { error } = await supabase.functions.invoke('tutor-memory', {
        body: {
          action: 'save_messages_batch',
          student_id: sid,
          session_id: sessionId,
          video_id: optionsRef.current.videoDbId || null,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            video_timestamp_seconds: m.video_timestamp_seconds,
          })),
        },
      });

      if (error) throw error;
      logger.debug('[TutorMemory] Messages flushed successfully');
    } catch (err) {
      logger.error('[TutorMemory] Error flushing messages:', err);
      // Put messages back in buffer for retry
      messageBufferRef.current = [...messages, ...messageBufferRef.current];
    }
  }, [sessionId]);

  // Add a message to the buffer
  const addMessage = useCallback((role: 'user' | 'assistant', content: string, videoTimestamp?: number) => {
    if (!content || content.length < 2) return; // Skip empty/trivial messages

    messageBufferRef.current.push({
      role,
      content: content.substring(0, 2000), // Cap message length
      video_timestamp_seconds: videoTimestamp,
      timestamp: Date.now(),
    });

    // Auto-flush if buffer is full
    if (messageBufferRef.current.length >= FLUSH_THRESHOLD) {
      flushMessages();
    }
  }, [flushMessages]);

  // End session — flush remaining messages and trigger analysis
  const endSession = useCallback(async () => {
    const sid = optionsRef.current.studentId;
    if (!sid) return;

    // Flush remaining messages
    await flushMessages();

    // Trigger learning pattern analysis
    try {
      await supabase.functions.invoke('tutor-memory', {
        body: {
          action: 'end_session',
          student_id: sid,
          video_id: optionsRef.current.videoDbId || null,
          session_id: sessionId,
        },
      });
      logger.debug('[TutorMemory] Session ended, analysis triggered');
    } catch (err) {
      logger.error('[TutorMemory] Error ending session:', err);
    }
  }, [sessionId, flushMessages]);

  // Set up periodic flush timer
  useEffect(() => {
    flushTimerRef.current = setInterval(flushMessages, FLUSH_INTERVAL_MS);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [flushMessages]);

  // Set up periodic context refresh (mid-session updates)
  useEffect(() => {
    if (!studentId) return;

    refreshTimerRef.current = setInterval(() => {
      logger.debug('[TutorMemory] Mid-session context refresh');
      fetchMemoryContext();
    }, CONTEXT_REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [studentId, fetchMemoryContext]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      // Sync flush attempt on unmount
      const sid = optionsRef.current.studentId;
      if (sid && messageBufferRef.current.length > 0) {
        const messages = messageBufferRef.current.map(m => ({
          role: m.role,
          content: m.content,
          video_timestamp_seconds: m.video_timestamp_seconds,
        }));
        // Use navigator.sendBeacon for reliable delivery on page unload
        const payload = JSON.stringify({
          action: 'save_messages_batch',
          student_id: sid,
          session_id: sessionId,
          video_id: optionsRef.current.videoDbId || null,
          messages,
        });
        // Attempt async flush via supabase, but don't await
        supabase.functions.invoke('tutor-memory', { body: JSON.parse(payload) })
          .catch(() => {});
      }
    };
  }, [sessionId]);

  return {
    memoryContext,
    isLoading,
    sessionId,
    fetchMemoryContext,
    addMessage,
    endSession,
  };
}
