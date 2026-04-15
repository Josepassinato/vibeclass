import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { IntlProvider } from "react-intl";
import { useState, lazy, Suspense } from "react";
import { LOCALES, getSavedLocale, saveLocale, SupportedLocale } from "./i18n";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { BrandingProvider } from "./branding";

const Admin = lazy(() => import("./pages/Admin"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Student = lazy(() => import("./pages/Student"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const DebugPanel = lazy(() => import("./components/DebugPanel"));
const AuthPage = lazy(() => import("./components/auth/AuthPage"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoading } = useAuth();
  const [searchParams] = useSearchParams();

  // Bypass auth for testing: ?bypass=test
  if (searchParams.get('bypass') === 'test') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/" element={<Navigate to="/aluno" replace />} />
    <Route
      path="/login"
      element={<AuthPage />}
    />
    <Route path="/admin" element={<Admin />} />
    <Route path="/admin/analytics" element={<Analytics />} />
    <Route
      path="/aluno"
      element={
        <ProtectedRoute>
          <Student />
        </ProtectedRoute>
      }
    />
    <Route
      path="/aluno/dashboard"
      element={
        <ProtectedRoute>
          <StudentDashboard />
        </ProtectedRoute>
      }
    />
    <Route path="/verificar/:code" element={<VerifyCertificate />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
  </Suspense>
);

const AppContent = () => {
  const [locale, setLocale] = useState<SupportedLocale>(getSavedLocale());
  const messages = LOCALES[locale].messages;

  const handleLocaleChange = (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    saveLocale(newLocale);
  };

  return (
    <IntlProvider locale={locale} messages={messages} defaultLocale="pt-BR">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </BrowserRouter>
            <DebugPanel />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </IntlProvider>
  );
};

const App = () => (
  <BrandingProvider>
    <AppContent />
  </BrandingProvider>
);

export default App;
