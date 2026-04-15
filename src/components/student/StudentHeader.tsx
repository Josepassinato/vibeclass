import { Link } from 'react-router-dom';
import { BarChart3, LogOut, Menu, User, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBranding } from '@/branding';

interface StudentHeaderProps {
  lessonNumber?: number;
  lessonTitle?: string;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  onMenuClick?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  showMenuButton?: boolean;
  userName?: string | null;
  userAvatar?: string | null;
  onSignOut?: () => void;
}

export function StudentHeader({
  lessonNumber,
  lessonTitle,
  completedLessons,
  totalLessons,
  progressPercentage,
  onMenuClick,
  onToggleSidebar,
  sidebarCollapsed,
  showMenuButton,
  userName,
  userAvatar,
  onSignOut,
}: StudentHeaderProps) {
  const { config, labels } = useBranding();

  const initials = userName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AL';

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50 h-14">
      <div className="px-4 h-full flex items-center gap-3">
        {/* Mobile menu button */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 lg:hidden flex-shrink-0"
            onClick={onMenuClick}
            aria-label={`Abrir menu de ${labels.lessonPlural}`}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {/* Desktop sidebar toggle */}
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hidden lg:inline-flex flex-shrink-0"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? `Abrir lista de ${labels.lessonPlural}` : `Fechar lista de ${labels.lessonPlural}`}
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}

        {/* Logo */}
        <span className="text-base font-semibold tracking-tight flex-shrink-0">
          {config.brandName}
        </span>

        {/* Lesson title */}
        {lessonTitle && (
          <div className="hidden sm:flex items-center gap-2 min-w-0 flex-1">
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm text-muted-foreground truncate">{lessonTitle}</span>
          </div>
        )}

        <div className="flex-1 sm:flex-none" />

        {/* Progress - compact */}
        {totalLessons > 0 && (
          <div className="hidden md:flex items-center gap-2.5">
            <Progress value={progressPercentage} className="h-1.5 w-24" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedLessons}/{totalLessons}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            asChild
            aria-label="Ver dashboard"
          >
            <Link to="/aluno/dashboard">
              <BarChart3 className="h-4 w-4" />
            </Link>
          </Button>

          <ThemeToggle />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={userAvatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userName || labels.learnerSingularTitle}</p>
                <p className="text-xs text-muted-foreground">{labels.learnerSingularTitle}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/aluno/dashboard" className="cursor-pointer">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Admin
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
