import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Wifi,
  WifiOff,
  HardDrive,
  Trash2,
  RefreshCw,
  Check,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoItem {
  id: string;
  title: string;
  transcript: string;
  youtube_id: string;
}

interface QuizItem {
  id: string;
  questions: unknown[];
}

interface OfflineManagerProps {
  videos: VideoItem[];
  quizzes: QuizItem[];
}

interface CachedLesson {
  id: string;
  title: string;
  transcript: string;
  youtube_id: string;
  quiz?: unknown[];
  cachedAt: number;
  sizeBytes: number;
}

interface PendingSyncItem {
  id?: number;
  type: 'quiz_answer' | 'mission_submission';
  payload: unknown;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

const DB_NAME = 'vibe-class-offline';
const LESSONS_STORE = 'lessons';
const PENDING_STORE = 'pending_sync';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LESSONS_STORE)) {
        db.createObjectStore(LESSONS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllCached(): Promise<CachedLesson[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LESSONS_STORE, 'readonly');
    const store = tx.objectStore(LESSONS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as CachedLesson[]);
    req.onerror = () => reject(req.error);
  });
}

async function cacheLesson(lesson: CachedLesson): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LESSONS_STORE, 'readwrite');
    const store = tx.objectStore(LESSONS_STORE);
    store.put(lesson);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeCached(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LESSONS_STORE, 'readwrite');
    const store = tx.objectStore(LESSONS_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingSyncItems(): Promise<PendingSyncItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readonly');
    const store = tx.objectStore(PENDING_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as PendingSyncItem[]);
    req.onerror = () => reject(req.error);
  });
}

async function clearPendingSync(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function savePendingSync(item: Omit<PendingSyncItem, 'id'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);
    store.add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function estimateBytes(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_STORAGE_BYTES = 50 * 1024 * 1024; // 50 MB soft limit

// ---------------------------------------------------------------------------
// Hook: online/offline detection
// ---------------------------------------------------------------------------

function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OfflineManager({ videos, quizzes }: OfflineManagerProps) {
  const isOnline = useOnlineStatus();
  const [cachedLessons, setCachedLessons] = useState<CachedLesson[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const syncAttempted = useRef(false);

  // Load cached data on mount
  const refreshCache = useCallback(async () => {
    try {
      const cached = await getAllCached();
      setCachedLessons(cached);
      const pending = await getPendingSyncItems();
      setPendingCount(pending.length);
    } catch {
      // IndexedDB unavailable
    }
  }, []);

  useEffect(() => {
    refreshCache();
  }, [refreshCache]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && autoSync && pendingCount > 0 && !syncAttempted.current) {
      syncAttempted.current = true;
      handleSync();
    }
    if (!isOnline) {
      syncAttempted.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, autoSync, pendingCount]);

  const totalUsed = cachedLessons.reduce((sum, l) => sum + l.sizeBytes, 0);
  const usagePercent = Math.min((totalUsed / MAX_STORAGE_BYTES) * 100, 100);

  const cachedIds = new Set(cachedLessons.map((l) => l.id));

  const quizMap = new Map(quizzes.map((q) => [q.id, q.questions]));

  // Download a lesson to IndexedDB
  const handleDownload = useCallback(
    async (video: VideoItem) => {
      setDownloading((prev) => ({ ...prev, [video.id]: 0 }));

      // Simulate staged progress (transcript + quiz + metadata)
      const steps = 3;
      for (let step = 1; step <= steps; step++) {
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
        setDownloading((prev) => ({
          ...prev,
          [video.id]: Math.round((step / steps) * 100),
        }));
      }

      const quiz = quizMap.get(video.id);
      const lesson: CachedLesson = {
        id: video.id,
        title: video.title,
        transcript: video.transcript,
        youtube_id: video.youtube_id,
        quiz: quiz ? (quiz as unknown[]) : undefined,
        cachedAt: Date.now(),
        sizeBytes: estimateBytes({ ...video, quiz }),
      };

      try {
        await cacheLesson(lesson);
        await refreshCache();
      } catch {
        // storage full or IDB error
      } finally {
        setDownloading((prev) => {
          const next = { ...prev };
          delete next[video.id];
          return next;
        });
      }
    },
    [quizMap, refreshCache]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await removeCached(id);
        await refreshCache();
      } catch {
        // ignore
      }
    },
    [refreshCache]
  );

  const handleSync = useCallback(async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);

    try {
      const pending = await getPendingSyncItems();
      if (pending.length === 0) return;

      // In a real implementation this would POST each item to the API.
      // For now we simulate a brief delay per item.
      for (const _item of pending) {
        await new Promise((r) => setTimeout(r, 300));
      }

      await clearPendingSync();
      await refreshCache();
    } catch {
      // sync failed — will retry next time
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing, refreshCache]);

  return (
    <Card className="bg-zinc-900/95 border-zinc-800 text-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-violet-400" />
            Conteúdo Offline
          </CardTitle>

          {/* Online/offline badge */}
          <Badge
            variant="outline"
            className={`text-[11px] ${
              isOnline
                ? 'border-emerald-500/50 text-emerald-400'
                : 'border-amber-500/50 text-amber-400'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Sincronizado
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Modo Offline
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Storage info */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Armazenamento</span>
            <span>
              {formatBytes(totalUsed)} / {formatBytes(MAX_STORAGE_BYTES)}
            </span>
          </div>
          <Progress value={usagePercent} className="h-1.5 bg-zinc-800" />
        </div>

        {/* Auto-sync toggle */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-zinc-300">
            <Cloud className="h-3.5 w-3.5" />
            <span>Sincronização automática</span>
          </div>
          <Switch
            checked={autoSync}
            onCheckedChange={setAutoSync}
            className="data-[state=checked]:bg-violet-600"
          />
        </div>

        {/* Pending sync */}
        {pendingCount > 0 && (
          <div className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <CloudOff className="h-3.5 w-3.5" />
              <span>
                {pendingCount} {pendingCount === 1 ? 'item pendente' : 'itens pendentes'}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-violet-400 hover:text-violet-300"
              onClick={handleSync}
              disabled={!isOnline || syncing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        )}

        {/* Available lessons for download */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Aulas disponíveis
          </h4>

          <AnimatePresence mode="popLayout">
            {videos.map((video) => {
              const isCached = cachedIds.has(video.id);
              const progress = downloading[video.id];
              const isDownloading = progress !== undefined;

              return (
                <motion.div
                  key={video.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2.5 gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{video.title}</p>
                    {isCached && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-[10px] h-4 border-emerald-500/40 text-emerald-400"
                      >
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        Disponível offline
                      </Badge>
                    )}
                    {isDownloading && (
                      <div className="mt-1.5 space-y-0.5">
                        <Progress value={progress} className="h-1 bg-zinc-700" />
                        <span className="text-[10px] text-zinc-500">{progress}%</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isCached ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                        onClick={() => handleRemove(video.id)}
                        title="Remover do cache"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-violet-400 hover:text-violet-300"
                        onClick={() => handleDownload(video)}
                        disabled={isDownloading}
                        title="Baixar para uso offline"
                      >
                        {isDownloading ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Cached content summary */}
        {cachedLessons.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-zinc-800">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Em cache ({cachedLessons.length})
            </h4>
            {cachedLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between text-xs text-zinc-400 px-1"
              >
                <span className="truncate flex-1 mr-2">{lesson.title}</span>
                <span className="text-zinc-600 whitespace-nowrap">
                  {formatBytes(lesson.sizeBytes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
