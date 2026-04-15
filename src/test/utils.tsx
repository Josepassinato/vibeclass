import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions, renderHook, act } from '@testing-library/react';
import { screen, waitFor, within, fireEvent } from '@testing-library/dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrandingProvider } from '@/branding';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

interface AllTheProvidersProps {
  children: React.ReactNode;
  withRouter?: boolean;
}

const AllTheProviders = ({ children, withRouter = true }: AllTheProvidersProps) => {
  const wrappedChildren = withRouter ? <BrowserRouter>{children}</BrowserRouter> : <>{children}</>;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BrandingProvider>
          <TooltipProvider>
            {wrappedChildren}
          </TooltipProvider>
        </BrandingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  withRouter?: boolean;
};

const render = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { withRouter = true, ...renderOptions } = options || {};
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders withRouter={withRouter}>{children}</AllTheProviders>
  );

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
};

export { render, screen, waitFor, within, fireEvent, renderHook, act };
