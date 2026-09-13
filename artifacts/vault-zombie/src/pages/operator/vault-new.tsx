import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  getGetEntitlementByCheckoutSessionQueryKey,
  useCreateOperatorVault,
  useGetEntitlementByCheckoutSession,
  useListOperatorVaultTypes,
  useStartEntitlement,
} from "@workspace/api-client-react";
type PlanTierAll = "lockbox" | "safe" | "vault" | "deep_vault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TierChooser } from "@/components/tier-chooser";
import { getTierLabel } from "@/lib/utils";
import { VAULT_ART } from "./operator-page";

/**
 * /operator/vaults/new (Flow1 Build Stages 2.3-2.4). One page carries every
 * state of the tier-first vault-creation flow: the tier chooser fallback,
 * the Lockbox/paid entitlement start, the Stripe Checkout wait, and the
 * details form (2.4). Gift redemption (2.5) hands off here too, arriving
 * already holding a spent-ready billingRecordId.
 */

type Stage =
  | { kind: "loading" }
  | { kind: "chooser"; cancelled: boolean }
  | { kind: "confirming" }
  | { kind: "details"; billingRecordId: string; targetTier: PlanTierAll; banner: string | null };

export default function VaultNewPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const tierParam = params.get("tier");
  const checkoutSessionId = params.get("checkout_session_id");
  const checkoutCancelled = params.get("checkout_cancelled") === "1";
  const handoffBillingRecordId = params.get("billingRecordId");
  const bannerParam = params.get("banner");

  const startEntitlement = useStartEntitlement();
  const startedForTier = startEntitlement.data?.targetTier ?? null;

  // Kick off (or reuse) an entitlement the moment a tier is chosen from the URL.
  useEffect(() => {
    if (!tierParam || handoffBillingRecordId) return;
    if (startEntitlement.isPending || startEntitlement.isSuccess || startEntitlement.isError) return;
    startEntitlement.mutate({ data: { targetTier: tierParam as PlanTierAll } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierParam, handoffBillingRecordId]);

  useEffect(() => {
    if (startEntitlement.isSuccess && startEntitlement.data.status === "checkout" && startEntitlement.data.checkoutUrl) {
      window.location.href = startEntitlement.data.checkoutUrl;
    }
  }, [startEntitlement.isSuccess, startEntitlement.data]);

  const sessionStatus = useGetEntitlementByCheckoutSession(checkoutSessionId ?? "", {
    query: {
      queryKey: getGetEntitlementByCheckoutSessionQueryKey(checkoutSessionId ?? ""),
      enabled: Boolean(checkoutSessionId),
      refetchInterval: (query) => (query.state.data?.status === "pending" ? 2000 : false),
    },
  });

  useEffect(() => {
    if (sessionStatus.isError) {
      toast({ title: "Payment not found", description: "We could not find that Checkout session.", variant: "destructive" });
    }
  }, [sessionStatus.isError, toast]);

  let stage: Stage;
  if (handoffBillingRecordId && tierParam) {
    stage = {
      kind: "details",
      billingRecordId: handoffBillingRecordId,
      targetTier: tierParam as PlanTierAll,
      banner: bannerParam === "gift" ? `Your gift is unlocked. Let's set up your ${getTierLabel(tierParam)} vault.` : null,
    };
  } else if (checkoutSessionId) {
    if (sessionStatus.isLoading || sessionStatus.data?.status === "pending") {
      stage = { kind: "confirming" };
    } else if (sessionStatus.data?.status === "paid") {
      stage = {
        kind: "details",
        billingRecordId: sessionStatus.data.billingRecordId,
        targetTier: sessionStatus.data.targetTier,
        banner: `Payment received. Your ${getTierLabel(sessionStatus.data.targetTier)} plan is ready. Let's set up your vault.`,
      };
    } else {
      stage = { kind: "chooser", cancelled: true };
    }
  } else if (tierParam === "lockbox") {
    if (startEntitlement.isSuccess) {
      stage = { kind: "details", billingRecordId: startEntitlement.data.billingRecordId, targetTier: "lockbox", banner: null };
    } else if (startEntitlement.isError) {
      stage = { kind: "chooser", cancelled: false };
    } else {
      stage = { kind: "loading" };
    }
  } else if (tierParam) {
    if (startEntitlement.isSuccess && startEntitlement.data.status === "ready") {
      stage = { kind: "details", billingRecordId: startEntitlement.data.billingRecordId, targetTier: startedForTier ?? tierParam as PlanTierAll, banner: null };
    } else if (startEntitlement.isSuccess && startEntitlement.data.status === "checkout") {
      stage = { kind: "loading" };
    } else if (startEntitlement.isError) {
      stage = { kind: "chooser", cancelled: false };
    } else {
      stage = { kind: "loading" };
    }
  } else {
    stage = { kind: "chooser", cancelled: checkoutCancelled };
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-4xl text-ink mb-8 text-center">Start a new vault</h1>
        {stage.kind === "loading" && (
          <p className="text-center text-text-2 text-lg py-16">One moment…</p>
        )}
        {stage.kind === "confirming" && (
          <p className="text-center text-text-2 text-lg py-16">Confirming your payment...</p>
        )}
        {stage.kind === "chooser" && (
          <>
            {stage.cancelled && (
              <p className="text-center text-text-2 mb-6">No payment was taken. Pick a plan whenever you're ready.</p>
            )}
            <TierChooser />
          </>
        )}
        {stage.kind === "details" && (
          <DetailsForm billingRecordId={stage.billingRecordId} targetTier={stage.targetTier} banner={stage.banner} onCreated={(vaultId) => setLocation(`/operator/vaults/${vaultId}/setup`)} />
        )}
      </div>
    </div>
  );
}

function suggestName(tokens: string[], subjectValues: Record<string, string>): string {
  return tokens.map((t) => subjectValues[t]?.trim()).filter(Boolean).join(" and ");
}

function DetailsForm({
  billingRecordId,
  targetTier,
  banner,
  onCreated,
}: {
  billingRecordId: string;
  targetTier: PlanTierAll;
  banner: string | null;
  onCreated: (vaultId: string) => void;
}) {
  const { toast } = useToast();
  const vaultTypes = useListOperatorVaultTypes();
  const createVault = useCreateOperatorVault();

  const [vaultTypeId, setVaultTypeId] = useState<string | null>(null);
  const [subjectValues, setSubjectValues] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);

  useEffect(() => {
    if (!vaultTypeId && vaultTypes.data && vaultTypes.data.length > 0) {
      setVaultTypeId(vaultTypes.data[0].id);
    }
  }, [vaultTypeId, vaultTypes.data]);

  const selectedType = vaultTypes.data?.find((t) => t.id === vaultTypeId) ?? null;

  useEffect(() => {
    // A new vault type starts its subject fields fresh; the name suggestion
    // restarts too, so switching types never carries over the old name lock.
    setSubjectValues({});
    setNameEdited(false);
    setName("");
  }, [vaultTypeId]);

  function updateSubjectValue(token: string, value: string) {
    const next = { ...subjectValues, [token]: value };
    setSubjectValues(next);
    if (!nameEdited && selectedType) {
      setName(suggestName(selectedType.requiredSubjectTokens, next));
    }
  }

  function isTokenRequired(type: { slug: string }, token: string): boolean {
    return !(type.slug === "baby" && token === "[Baby]");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vaultTypeId || !selectedType) return;
    const missingToken = selectedType.requiredSubjectTokens.find(
      (t) => isTokenRequired(selectedType, t) && !subjectValues[t]?.trim(),
    );
    if (missingToken || !name.trim()) return;
    createVault.mutate(
      { data: { billingRecordId, vaultTypeId, name: name.trim(), subjectValues } },
      {
        onSuccess: (res) => onCreated(res.vaultId),
        onError: (err: any) => {
          toast({ title: "Could not create vault", description: err?.message ?? "Something went wrong.", variant: "destructive" });
        },
      },
    );
  }

  const canSubmit = Boolean(
    vaultTypeId && selectedType && name.trim() &&
    selectedType.requiredSubjectTokens.every((t) => !isTokenRequired(selectedType, t) || subjectValues[t]?.trim()),
  );

  return (
    <div className="max-w-2xl mx-auto">
      {banner && (
        <div className="bg-bronze-wash/40 border border-border rounded-xl p-4 mb-8 text-center text-ink font-medium">
          {banner}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-8 bg-card border border-border p-6 rounded-xl shadow-sm">
        <div className="space-y-4">
          <Label className="text-lg font-bold text-ink">Vault type</Label>
          {vaultTypes.isLoading && <p className="text-sm text-text-2">Loading vault types...</p>}
          {vaultTypes.isError && <p className="text-sm text-destructive">Unable to load vault types.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {vaultTypes.data?.map((type) => {
              const art = VAULT_ART[type.slug];
              const selected = type.id === vaultTypeId;
              return (
                <button
                  type="button"
                  key={type.id}
                  data-testid={`button-vault-type-${type.slug}`}
                  onClick={() => setVaultTypeId(type.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${selected ? "border-vault-accent bg-bronze-wash/30" : "border-border hover:bg-muted/50"}`}
                >
                  {art && <img src={`${import.meta.env.BASE_URL}vault-art/${art}`} alt="" className="h-10 w-10 object-contain" />}
                  <span className="text-xs font-medium text-ink text-center">{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedType && selectedType.requiredSubjectTokens.length > 0 && (
          <div className="space-y-4">
            <Label className="text-lg font-bold text-ink">Subject names</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedType.requiredSubjectTokens.map((token) => {
                const required = isTokenRequired(selectedType, token);
                return (
                  <div className="space-y-2" key={token}>
                    <Label htmlFor={`subject-${token}`}>{token}</Label>
                    <Input
                      id={`subject-${token}`}
                      value={subjectValues[token] ?? ""}
                      onChange={(e) => updateSubjectValue(token, e.target.value)}
                      required={required}
                    />
                    {!required && (
                      <p className="text-sm text-text-2">Leave this blank if the name is not decided yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="vault-name" className="text-lg font-bold text-ink">Vault name</Label>
          <Input
            id="vault-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
            required
          />
        </div>

        <Button type="submit" disabled={!canSubmit || createVault.isPending} className="w-full py-6 text-lg font-bold bg-ink text-primary-foreground hover:bg-ink-2">
          {createVault.isPending ? "Creating vault..." : "Create vault"}
        </Button>
      </form>
    </div>
  );
}
