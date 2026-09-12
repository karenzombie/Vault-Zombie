import { type ComponentType, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, RedirectToSignIn, useAuth } from '@clerk/react';
import { getGetAdminDashboardQueryKey, useGetAdminDashboard } from '@workspace/api-client-react';
import { ConsentGate } from '@/components/consent-gate';

import NotFound from '@/pages/not-found';
import Landing from '@/pages/public/landing';
import GuestFlow from '@/pages/guest/guest-flow';
import GiftPurchasePage from '@/pages/public/gift-purchase';
import GiftSuccessPage from '@/pages/public/gift-success';
import GiftCancelPage from '@/pages/public/gift-cancel';
import GiftRedeemPage from '@/pages/operator/gift-redeem';
import VaultNewPage from '@/pages/operator/vault-new';
import VaultSetupPage from '@/pages/operator/vault-setup';
import OperatorPage, { OperatorReveal } from '@/pages/operator/operator-page';
import { useParams } from 'wouter';
import AdminPage from '@/pages/admin/admin';
import SignInPage from '@/pages/auth/sign-in';
import SignUpPage from '@/pages/auth/sign-up';

/* Reports */
import HealthReportPage from '@/pages/operator/reports/health';
import SummaryReportPage from '@/pages/operator/reports/summary';
import ScoreboardReportPage from '@/pages/operator/reports/scoreboard';
import AreaReportPage from '@/pages/operator/reports/area';
import TimelineReportPage from '@/pages/operator/reports/timeline';
import ArchiveReportPage from '@/pages/operator/reports/archive';
import KeepsakeReportPage from '@/pages/operator/reports/keepsake';
import FinaleReportPage from '@/pages/operator/reports/finale';
import QuestionReportPage from '@/pages/operator/reports/question';
import GuestPersonalReportPage from '@/pages/operator/reports/guest';
import RevealReportPage from '@/pages/operator/reports/reveal';

const queryClient = new QueryClient();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

function requireOperator<T extends object>(Component: ComponentType<T>) {
  if (!PUBLISHABLE_KEY) return Component;
  return function AuthenticatedOperatorRoute(props: T) {
    const { isLoaded, isSignedIn } = useAuth();
    if (!isLoaded) {
      return <div className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Checking your session…</div>;
    }
    if (!isSignedIn) return <RedirectToSignIn />;
    return <ConsentGate><Component {...props} /></ConsentGate>;
  };
}

function OperatorRevealRoute() {
  const { vaultId } = useParams<{ vaultId: string }>();
  if (!vaultId) return <NotFound />;
  return <OperatorReveal vaultId={vaultId} />;
}

function VaultSetupRoute() {
  const { vaultId } = useParams<{ vaultId: string }>();
  if (!vaultId) return <NotFound />;
  return <VaultSetupPage vaultId={vaultId} />;
}

const AuthenticatedOperator = requireOperator(OperatorPage);
const AuthenticatedOperatorReveal = requireOperator(OperatorRevealRoute);
const AuthenticatedVaultSetup = requireOperator(VaultSetupRoute);
const AuthenticatedHealthReport = requireOperator(HealthReportPage);
const AuthenticatedSummaryReport = requireOperator(SummaryReportPage);
const AuthenticatedScoreboardReport = requireOperator(ScoreboardReportPage);
const AuthenticatedAreaReport = requireOperator(AreaReportPage);
const AuthenticatedTimelineReport = requireOperator(TimelineReportPage);
const AuthenticatedArchiveReport = requireOperator(ArchiveReportPage);
const AuthenticatedKeepsakeReport = requireOperator(KeepsakeReportPage);
const AuthenticatedFinaleReport = requireOperator(FinaleReportPage);
const AuthenticatedRevealReport = requireOperator(RevealReportPage);
const AuthenticatedQuestionReport = requireOperator(QuestionReportPage);
const AuthenticatedGuestReport = requireOperator(GuestPersonalReportPage);
const AuthenticatedGiftRedeem = requireOperator(GiftRedeemPage);
const AuthenticatedVaultNew = requireOperator(VaultNewPage);
function MissingAdminConfiguration() {
  return <div className="min-h-[100dvh] grid place-items-center bg-background p-6 text-center text-destructive">Administrator access is unavailable because authentication is not configured.</div>;
}

function AuthenticatedAdminRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Checking your session…</div>;
  if (!isSignedIn) return <RedirectToSignIn />;
  return <ConsentGate><AdminAccess /></ConsentGate>;
}

function AdminAccess() {
  const dashboard = useGetAdminDashboard({ query: { enabled: true, retry: false, queryKey: getGetAdminDashboardQueryKey() } });
  if (dashboard.isLoading) return <div className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Verifying administrator access…</div>;
  if (dashboard.isError) return <div className="min-h-[100dvh] grid place-items-center bg-background p-6 text-center text-destructive">403 — Administrator access is required. Complete MFA and retry if your session is stale.</div>;
  return <AdminPage />;
}

const AuthenticatedAdmin = PUBLISHABLE_KEY ? AuthenticatedAdminRoute : MissingAdminConfiguration;

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/g/:token" component={GuestFlow} />

        {/* Gift Routes */}
        <Route path="/gifts/purchase" component={GiftPurchasePage} />
        <Route path="/gifts/checkout/success" component={GiftSuccessPage} />
        <Route path="/gifts/success" component={GiftSuccessPage} />
        <Route path="/gifts/checkout/cancelled" component={GiftCancelPage} />
        <Route path="/gifts/cancel" component={GiftCancelPage} />
        <Route path="/gifts/redeem" component={AuthenticatedGiftRedeem} />

        {/* Operator Reports Routes */}
        <Route path="/operator/vaults/:vaultId/reports/health" component={AuthenticatedHealthReport} />
        <Route path="/operator/vaults/:vaultId/reports/summary" component={AuthenticatedSummaryReport} />
        <Route path="/operator/vaults/:vaultId/reports/scoreboard" component={AuthenticatedScoreboardReport} />
        <Route path="/operator/vaults/:vaultId/reports/area" component={AuthenticatedAreaReport} />
        <Route path="/operator/vaults/:vaultId/reports/timeline" component={AuthenticatedTimelineReport} />
        <Route path="/operator/vaults/:vaultId/reports/archive" component={AuthenticatedArchiveReport} />
        <Route path="/operator/vaults/:vaultId/reports/keepsake" component={AuthenticatedKeepsakeReport} />
        <Route path="/operator/vaults/:vaultId/reports/finale" component={AuthenticatedFinaleReport} />
        <Route path="/operator/vaults/:vaultId/reports/reveals/:revealSlotId" component={AuthenticatedRevealReport} />
        <Route path="/operator/vaults/:vaultId/reports/questions/:questionId" component={AuthenticatedQuestionReport} />
        <Route path="/operator/vaults/:vaultId/reports/guests/:guestId" component={AuthenticatedGuestReport} />

        {/* Main Operator Route */}
        <Route path="/operator" component={AuthenticatedOperator} />
        <Route path="/operator/vaults/new" component={AuthenticatedVaultNew} />
        <Route path="/operator/vaults/:vaultId/setup" component={AuthenticatedVaultSetup} />
        <Route path="/operator/vaults/:vaultId" component={AuthenticatedOperatorReveal} />
        <Route path="/operator/gifts/redeem" component={AuthenticatedGiftRedeem} />

        {/* Admin Routes */}
        <Route path="/admin" component={AuthenticatedAdmin} />
        <Route path="/admin/:tab" component={AuthenticatedAdmin} />
        <Route path="/admin/:tab/:id" component={AuthenticatedAdmin} />

        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function LegalFooter() {
  return <footer className="border-0 bg-[#F6F4F0] px-4 py-3 text-center text-sm text-ink print:hidden"><a data-testid="link-terms-footer" className="underline underline-offset-2 transition-colors hover:text-bronze" href="/terms">Terms and Conditions</a><span aria-hidden="true"> · </span><a data-testid="link-privacy-footer" className="underline underline-offset-2 transition-colors hover:text-bronze" href="/privacy">Privacy Policy</a></footer>;
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
            <>{router}<LegalFooter /></>
          </ClerkProvider>
        ) : (
          <>{router}<LegalFooter /></>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
