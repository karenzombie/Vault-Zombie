import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider } from '@clerk/react';

import NotFound from '@/pages/not-found';
import Landing from '@/pages/public/landing';
import GuestFlow from '@/pages/guest/guest-flow';
import OperatorPage from '@/pages/operator/operator-page';
import AdminPlaceholder from '@/pages/admin/admin';
import SignInPage from '@/pages/auth/sign-in';
import SignUpPage from '@/pages/auth/sign-up';

const queryClient = new QueryClient();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/g/:token" component={GuestFlow} />
        <Route path="/operator" component={OperatorPage} />
        <Route path="/admin" component={AdminPlaceholder} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const router = (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router />
    </WouterRouter>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {PUBLISHABLE_KEY ? (
          <ClerkProvider
            publishableKey={PUBLISHABLE_KEY}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/operator"
            signUpFallbackRedirectUrl="/operator"
            appearance={{
              variables: {
                colorPrimary: '#8A6D3B',
                borderRadius: '0.75rem',
              },
            }}
          >
            {router}
          </ClerkProvider>
        ) : (
          router
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
