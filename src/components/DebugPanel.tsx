import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bug, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  data?: unknown[];
}

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const originalConsole = useRef<{
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
  } | null>(null);

  const addLog = useCallback((level: LogEntry['level'], args: unknown[]) => {
    const message = args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      })
      .join(' ');

    setLogs((prev) => [
      ...prev.slice(-200), // Keep last 200 logs
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        level,
        message,
        data: args,
      },
    ]);
  }, []);

  useEffect(() => {
    // Store original console methods
    originalConsole.current = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    // Override console methods to capture logs in the debug panel
    console.log = (...args: unknown[]) => {
      originalConsole.current?.log.apply(console, args);
      addLog('log', args);
    };

    console.warn = (...args: unknown[]) => {
      originalConsole.current?.warn.apply(console, args);
      addLog('warn', args);
    };

    console.error = (...args: unknown[]) => {
      originalConsole.current?.error.apply(console, args);
      addLog('error', args);
    };

    console.info = (...args: unknown[]) => {
      originalConsole.current?.info.apply(console, args);
      addLog('info', args);
    };

    // Restore on cleanup
    return () => {
      if (originalConsole.current) {
        console.log = originalConsole.current.log;
        console.warn = originalConsole.current.warn;
        console.error = originalConsole.current.error;
        console.info = originalConsole.current.info;
      }
    };
  }, [addLog]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && isOpen && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen, isMinimized]);

  const clearLogs = () => setLogs([]);

  const getLevelStyles = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-destructive/20 text-destructive border-l-destructive';
      case 'warn':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-l-yellow-500';
      case 'info':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-l-blue-500';
      default:
        return 'bg-muted text-muted-foreground border-l-muted-foreground';
    }
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive" className="text-xs">ERROR</Badge>;
      case 'warn':
        return <Badge className="bg-yellow-500 text-white text-xs">WARN</Badge>;
      case 'info':
        return <Badge className="bg-blue-500 text-white text-xs">INFO</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">LOG</Badge>;
    }
  };

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[60] rounded-full h-12 w-12 p-0 shadow-lg"
        variant={errorCount > 0 ? 'destructive' : 'secondary'}
      >
        <Bug className="h-5 w-5" />
        {(errorCount > 0 || warnCount > 0) && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {errorCount + warnCount}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-20 right-4 z-[60] w-[500px] max-w-[calc(100vw-2rem)] shadow-xl border-2">
      <CardHeader className="py-2 px-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4" />
          <CardTitle className="text-sm font-medium">Debug Console</CardTitle>
          <Badge variant="outline" className="text-xs">{logs.length}</Badge>
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">{errorCount} errors</Badge>
          )}
          {warnCount > 0 && (
            <Badge className="bg-yellow-500 text-white text-xs">{warnCount} warns</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearLogs}
            title="Clear logs"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]" ref={scrollRef}>
            <div className="p-2 space-y-1">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No logs yet...
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      'text-xs p-2 rounded border-l-2 font-mono',
                      getLevelStyles(log.level)
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getLevelBadge(log.level)}
                      <span className="text-muted-foreground">
                        {log.timestamp.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}.{log.timestamp.getMilliseconds().toString().padStart(3, '0')}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap break-all overflow-hidden">
                      {log.message}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
};

export default DebugPanel;
