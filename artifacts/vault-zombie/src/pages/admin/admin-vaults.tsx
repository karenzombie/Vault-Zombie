import { useState } from "react";
import { useListAdminVaults, useGetAdminVaultSupportDetail, useManualUnlockVault, useResealAdminVault, useDownloadAdminVaultUnlockedExport, useGetAdminVaultDeletionPreview, useDeleteAdminVault, useListAdminVaultGuests, useSetAdminGuestEmailSubscription, useListAdminDeletedVaults, useRestoreAdminVault, getListAdminVaultsQueryKey, getGetAdminVaultSupportDetailQueryKey, getGetAdminVaultDeletionPreviewQueryKey, getDownloadAdminVaultUnlockedExportQueryKey, getListAdminVaultGuestsQueryKey, getListAdminDeletedVaultsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ChevronRight, ShieldAlert, Lock, Unlock, Download, Trash2, ArrowLeft, Mail, Archive, RotateCcw } from "lucide-react";
import { getTierLabel } from "@/lib/utils";
import { useSensitiveAdminAction } from "@/hooks/use-sensitive-admin-action";

export function AdminVaultsTab({ vaultId }: { vaultId?: string }) {
  if (vaultId) {
    return <VaultDetailView vaultId={vaultId} />;
  }
  return <VaultListView />;
}

function VaultListView() {
  const { data, isLoading } = useListAdminVaults();
  const [search, setSearch] = useState("");
  const [showArchive, setShowArchive] = useState(false);

  if (showArchive) {
    return <ArchivedVaultsView onBack={() => setShowArchive(false)} />;
  }

  if (isLoading) return <div className="p-12 text-center text-text-2">Loading vaults...</div>;

  const vaults = data?.vaults.filter(v => 
    v.id.includes(search) || v.name.toLowerCase().includes(search.toLowerCase()) || v.operatorName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white border border-border p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
          <Input 
            placeholder="Search by ID, name, or host..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setShowArchive(true)} data-testid="button-view-archive">
          <Archive className="w-4 h-4 mr-2" />
          View archive
        </Button>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted text-text-2 font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4 border-b">Vault / ID</th>
                <th className="px-6 py-4 border-b">Host</th>
                <th className="px-6 py-4 border-b">Tier / Type</th>
                <th className="px-6 py-4 border-b">Status</th>
                <th className="px-6 py-4 border-b">Referrals</th>
                <th className="px-6 py-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {vaults.map((vault) => (
                <tr key={vault.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-ink">{vault.name}</div>
                    <div className="text-text-2 text-xs font-mono mt-1">{vault.id}</div>
                  </td>
                  <td className="px-6 py-4 text-ink">{vault.operatorName}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-ink uppercase text-[10px] tracking-wider">{getTierLabel(vault.planTier as any)}</div>
                    <div className="text-text-2 text-xs mt-1">{vault.vaultTypeName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      vault.status === 'live' ? 'bg-pop-tint text-pop-dk' : 
                      vault.status === 'sealed' ? 'bg-ink text-background' :
                      vault.status === 'unlocked' ? 'bg-ok-tint text-ok' :
                      'bg-muted text-text-2'
                    }`}>
                      {vault.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{vault.referralCount}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/vaults/${vault.id}`}>
                      <Button variant="ghost" size="sm" className="hover:bg-muted"><ChevronRight className="w-4 h-4" /></Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {vaults.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-2">No vaults found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ArchivedVaultsView({ onBack }: { onBack: () => void }) {
  const { data, isLoading } = useListAdminDeletedVaults();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const vaults = data?.vaults || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} data-testid="button-back-from-archive">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to vaults
        </Button>
        <h2 className="font-display text-xl text-ink">Deleted vaults</h2>
      </div>

      {isLoading && <div className="p-12 text-center text-text-2">Loading archive...</div>}

      {!isLoading && (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted text-text-2 font-bold tracking-wider uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4 border-b">Vault / ID</th>
                  <th className="px-6 py-4 border-b">Host</th>
                  <th className="px-6 py-4 border-b">Tier / Type</th>
                  <th className="px-6 py-4 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {vaults.map((vault) => (
                  <tr key={vault.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-ink">{vault.name}</div>
                      <div className="text-text-2 text-xs font-mono mt-1">{vault.id}</div>
                    </td>
                    <td className="px-6 py-4 text-ink">{vault.operatorName}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-ink uppercase text-[10px] tracking-wider">{getTierLabel(vault.planTier as any)}</div>
                      <div className="text-text-2 text-xs mt-1">{vault.vaultTypeName}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => setRestoringId(vault.id)} data-testid={`button-restore-${vault.id}`}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))}
                {vaults.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-text-2">No deleted vaults.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {restoringId && (
        <RestoreVaultDialog
          vaultId={restoringId}
          vaultName={vaults.find((v) => v.id === restoringId)?.name || restoringId}
          open
          onClose={() => setRestoringId(null)}
        />
      )}
    </div>
  );
}

function RestoreVaultDialog({ vaultId, vaultName, open, onClose }: { vaultId: string, vaultName: string, open: boolean, onClose: () => void }) {
  const [reason, setReason] = useState("");
  const restore = useRestoreAdminVault();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await runSensitive(() => restore.mutateAsync({ vaultId, data: { reason } }));
      toast({ title: "Vault Restored", description: `${vaultName} is visible to its host again.` });
      queryClient.invalidateQueries({ queryKey: getListAdminDeletedVaultsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAdminVaultsQueryKey() });
      onClose();
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast({ title: "Fresh MFA Required", description: "Please re-authenticate.", variant: "destructive" });
      } else {
        toast({ title: "Action Failed", description: err?.response?.data?.message || "Unknown error", variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Restore Vault</DialogTitle>
          <DialogDescription>Returns "{vaultName}" to the status it held before deletion, visible to its host again.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRestore} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">Reason for restoring</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={1} maxLength={1000} placeholder="Host requested reversal..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={restore.isPending || reason.length < 1}>Restore Vault</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GuestEmailList({ vaultId }: { vaultId: string }) {
  const { data, isLoading } = useListAdminVaultGuests(vaultId);
  const queryClient = useQueryClient();
  const toggle = useSetAdminGuestEmailSubscription({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdminVaultGuestsQueryKey(vaultId) }) },
  });
  return (
    <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="bg-muted px-6 py-3 font-bold text-ink text-sm border-b border-border flex items-center gap-2"><Mail className="w-4 h-4" /> Guest Email Subscriptions</div>
      <div className="divide-y divide-hairline">
        {isLoading && <div className="p-4 text-sm text-text-2">Loading guests...</div>}
        {data?.guests.map((guest) => (
          <div key={guest.id} className="flex items-center justify-between px-6 py-3 text-sm">
            <span className="text-ink">{guest.displayName}</span>
            {!guest.hasEmail ? (
              <span className="text-xs uppercase tracking-wider text-text-2 font-bold">No email</span>
            ) : (
              <Button
                variant="outline" size="sm"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ vaultId, guestId: guest.id, data: { subscribed: guest.emailOptedOut } })}
              >
                {guest.emailOptedOut ? "Unsubscribed — Resubscribe" : "Subscribed — Unsubscribe"}
              </Button>
            )}
          </div>
        ))}
        {data?.guests.length === 0 && <div className="p-4 text-sm text-text-2 text-center">No guests yet.</div>}
      </div>
    </div>
  );
}

function VaultDetailView({ vaultId }: { vaultId: string }) {
  const { data, isLoading } = useGetAdminVaultSupportDetail(vaultId);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [resealOpen, setResealOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();
  const unlockedExport = useDownloadAdminVaultUnlockedExport(vaultId, { query: { enabled: false, queryKey: getDownloadAdminVaultUnlockedExportQueryKey(vaultId) } });

  if (isLoading) return <div className="p-12 text-center text-text-2">Loading vault detail...</div>;
  if (!data) return <div className="p-12 text-center text-destructive">Vault not found.</div>;

  const { vault, billingRecords, overageEvents, emailDeliveries } = data;
  const v = vault.vault;
  const scopes = vault.scopePreviews;
  const hasOverrides = scopes.some((scope) => scope.resealAvailable);
  const hasPaidUnlockedExport = v.planTier !== "lockbox" && vault.unlockedAnswerCount > 0;

   const handleExport = async () => {
      const response = await runSensitive(() => unlockedExport.refetch().then((result) => {
        if (result.error) throw result.error;
        return result;
      }));
      if (response.error || !response.data) {
        toast({ title: "Export Failed", description: "Complete fresh MFA if required, then try again.", variant: "destructive" });
        return;
      }
      const url = URL.createObjectURL(response.data as Blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: `vault-${vaultId}-unlocked.csv` });
      link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/vaults">
          <Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="w-4 h-4"/> Back</Button>
        </Link>
        <h2 className="font-display text-2xl text-ink">Vault Detail: {v.id}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-border p-6 rounded-xl shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display text-xl text-ink">{v.name}</h3>
                <div className="text-sm text-text-2 mt-1">Host: {v.operatorName} • Type: {v.vaultTypeName}</div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                v.status === 'live' ? 'bg-pop-tint text-pop-dk' : 
                v.status === 'sealed' ? 'bg-ink text-background' :
                v.status === 'unlocked' ? 'bg-ok-tint text-ok' :
                'bg-muted text-text-2'
              }`}>
                {v.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-xs text-text-2 uppercase tracking-wider font-bold mb-1">Guests</div>
                <div className="text-xl font-display">{vault.totals.guestCount}</div>
              </div>
              <div>
                <div className="text-xs text-text-2 uppercase tracking-wider font-bold mb-1">Predictions</div>
                <div className="text-xl font-display">{vault.totals.predictionCount}</div>
              </div>
              <div>
                <div className="text-xs text-text-2 uppercase tracking-wider font-bold mb-1">Answers</div>
                <div className="text-xl font-display">{vault.totals.answerCount}</div>
              </div>
              <div>
                <div className="text-xs text-text-2 uppercase tracking-wider font-bold mb-1">Referrals</div>
                <div className="text-xl font-display">{vault.referralCount}</div>
              </div>
            </div>
          </div>

          <GuestEmailList vaultId={v.id} />

          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-muted px-6 py-3 font-bold text-ink text-sm border-b border-border">Reveal Slots</div>
            <div className="p-4 space-y-3">
              {vault.revealSlots.map(slot => (
                <div key={slot.id} className="flex justify-between items-center text-sm p-3 bg-muted/30 rounded-lg">
                  <div>
                    <div className="font-bold text-ink">{slot.label}</div>
                    <div className="text-text-2 text-xs uppercase tracking-wider mt-1">{slot.kind}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-ink">{new Date(slot.revealDate).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {vault.revealSlots.length === 0 && <div className="text-text-2 text-sm text-center py-4">No reveal slots defined.</div>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-destructive/5 border border-destructive/20 p-5 rounded-xl shadow-sm">
            <h3 className="font-bold text-destructive flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4" /> Admin Actions
            </h3>
            <div className="space-y-3">
               {scopes.some((scope) => scope.answerCount > 0) && (
                <Button variant="outline" className="w-full justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => setUnlockOpen(true)}>
                  <Unlock className="w-4 h-4" /> Manual Unlock
                </Button>
              )}
               {hasOverrides && (
                <Button variant="outline" className="w-full justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => setResealOpen(true)}>
                  <Lock className="w-4 h-4" /> Manual Reseal
                </Button>
              )}
               {hasPaidUnlockedExport && (
                <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExport}>
                  <Download className="w-4 h-4" /> Download Export
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4" /> Delete Vault
              </Button>
            </div>
          </div>

          <div className="bg-white border border-border p-5 rounded-xl shadow-sm text-sm">
             <h3 className="font-bold text-ink mb-3">Support Context</h3>
             <div className="space-y-4">
               <div>
                 <div className="text-xs text-text-2 uppercase tracking-wider font-bold mb-1">Billing Records</div>
                 {billingRecords.length > 0 ? (
                   <div className="space-y-2">
                     {billingRecords.map(r => (
                       <div key={r.id} className="flex justify-between items-center text-xs">
                         <span>{(r.amountCents/100).toFixed(2)} {r.currency.toUpperCase()}</span>
                         <span className="font-bold text-ink">{r.status}</span>
                       </div>
                     ))}
                   </div>
                 ) : <div className="text-text-2 text-xs">None</div>}
               </div>
               <div>
                 <div className="text-xs text-text-2 uppercase tracking-wider font-bold mb-1">Overage Events</div>
                 {overageEvents.length > 0 ? (
                   <div className="space-y-2">
                     {overageEvents.map(e => (
                       <div key={e.id} className="flex justify-between items-center text-xs">
                         <span className="text-warn">{e.submissionCount} / {e.guestCap}</span>
                         <span className="font-bold">{e.outcome || "Unresolved"}</span>
                       </div>
                     ))}
                   </div>
                 ) : <div className="text-text-2 text-xs">None</div>}
               </div>
                <div>
                 <div className="text-xs text-text-2 uppercase tracking-wider font-bold mb-1">Recent Emails</div>
                 {emailDeliveries.length > 0 ? (
                   <div className="space-y-2">
                     {emailDeliveries.slice(0,5).map(e => (
                       <div key={e.id} className="flex justify-between items-center text-xs">
                         <span className="truncate max-w-[120px]" title={e.recipientEmail}>{e.recipientEmail}</span>
                         <span className={e.status === 'failed' ? 'text-destructive font-bold' : ''}>{e.status}</span>
                       </div>
                     ))}
                   </div>
                 ) : <div className="text-text-2 text-xs">None</div>}
               </div>
             </div>
          </div>
        </div>
      </div>

      <ManualUnlockDialog vaultId={vaultId} vaultName={v.name} open={unlockOpen} onClose={() => setUnlockOpen(false)} scopes={scopes} />
      <ManualResealDialog vaultId={vaultId} vaultName={v.name} open={resealOpen} onClose={() => setResealOpen(false)} scopes={scopes} />
      <DeleteVaultDialog vaultId={vaultId} vaultName={v.name} exportAvailable={hasPaidUnlockedExport} open={deleteOpen} onClose={() => setDeleteOpen(false)} onExport={handleExport} />
    </div>
  );
}

function ManualUnlockDialog({ vaultId, vaultName, open, onClose, scopes }: { vaultId: string, vaultName: string, open: boolean, onClose: () => void, scopes: any[] }) {
  const [scope, setScope] = useState<"entire_vault" | "reveal_slot" | "milestone">("entire_vault");
  const [slotId, setSlotId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [sendEmails, setSendEmails] = useState(false);
  
  const unlock = useManualUnlockVault();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== vaultName) return;

    const selected = scopes.find((item) => item.scope === scope && (scope !== "reveal_slot" || item.revealSlotId === slotId));
    if (!selected) return;
    try {
      await runSensitive(() => unlock.mutateAsync({ vaultId, data: { scope, revealSlotId: selected.revealSlotId || undefined, reason, confirmation: confirmName, sendEmails } }));
        toast({ title: "Vault Unlocked", description: "The manual unlock action was successful." });
        queryClient.invalidateQueries({ queryKey: getGetAdminVaultSupportDetailQueryKey(vaultId) });
        onClose();
    } catch (err: any) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          toast({ title: "Fresh MFA Required", description: "Please re-authenticate.", variant: "destructive" });
        } else {
          toast({ title: "Action Failed", description: err?.response?.data?.message || "Unknown error", variant: "destructive" });
        }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2"><Unlock className="w-5 h-5"/> Manual Vault Unlock</DialogTitle>
          <DialogDescription>This is a highly privileged action. It will reveal sealed data prematurely.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUnlock} className="space-y-4">
           <div className="space-y-2">
             <label className="text-sm font-bold">Scope</label>
             <select value={scope} onChange={(e) => setScope(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
               <option value="entire_vault">Entire Vault</option>
               <option value="reveal_slot">Specific Reveal Slot</option>
               <option value="milestone">Milestone Only</option>
             </select>
           </div>
            {scope === "reveal_slot" && (
             <div className="space-y-2">
               <label className="text-sm font-bold">Target Slot</label>
               <select value={slotId} onChange={(e) => setSlotId(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                 <option value="">Select a slot...</option>
                  {scopes.filter(s => s.scope === "reveal_slot").map(s => (
                    <option key={s.revealSlotId} value={s.revealSlotId}>{s.label}</option>
                 ))}
               </select>
             </div>
           )}
            {(() => {
              const selected = scopes.find((item) => item.scope === scope && (scope !== "reveal_slot" || item.revealSlotId === slotId));
              return selected ? <div className="rounded bg-muted p-3 text-sm"><strong>Confirm scope: {selected.label}</strong><br />{selected.answerCount} answers · {selected.predictionCount} predictions · {selected.guestCount} distinct guests</div> : null;
            })()}
           <div className="space-y-2">
             <label className="text-sm font-bold">Reason for unlock</label>
             <Input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} placeholder="Support request #123..." />
           </div>
           <div className="space-y-2">
             <label className="text-sm font-bold text-destructive">Type "{vaultName}" to confirm</label>
             <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} required />
           </div>
           <div className="flex items-center gap-2 pt-2">
             <input type="checkbox" id="sendEmails" checked={sendEmails} onChange={(e) => setSendEmails(e.target.checked)} className="rounded border-gray" />
             <label htmlFor="sendEmails" className="text-sm">Dispatch notification emails to guests (default OFF)</label>
           </div>
           <DialogFooter>
             <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
             <Button type="submit" variant="destructive" disabled={unlock.isPending || confirmName !== vaultName || reason.length < 10}>Execute Unlock</Button>
           </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManualResealDialog({ vaultId, vaultName, open, onClose, scopes }: { vaultId: string, vaultName: string, open: boolean, onClose: () => void, scopes: any[] }) {
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [scopeKey, setScopeKey] = useState("");
  
  const reseal = useResealAdminVault();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();

  const handleReseal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== vaultName) return;

    const selected = scopes.find((scope) => `${scope.scope}:${scope.revealSlotId ?? ""}` === scopeKey);
    if (!selected) return;
    try {
      await runSensitive(() => reseal.mutateAsync({ vaultId, data: { reason, confirmation: confirmName, scope: selected.scope, revealSlotId: selected.revealSlotId ?? undefined } }));
        toast({ title: "Vault Resealed", description: "The manual reseal action was successful." });
        queryClient.invalidateQueries({ queryKey: getGetAdminVaultSupportDetailQueryKey(vaultId) });
        onClose();
    } catch (err: any) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          toast({ title: "Fresh MFA Required", description: "Please re-authenticate.", variant: "destructive" });
        } else {
          toast({ title: "Action Failed", description: err?.response?.data?.message || "Unknown error", variant: "destructive" });
        }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2"><Lock className="w-5 h-5"/> Manual Vault Reseal</DialogTitle>
          <DialogDescription>This action will lock previously revealed answers.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleReseal} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-bold">Scope to reseal</label>
              <select value={scopeKey} onChange={(e) => setScopeKey(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select overridden scope...</option>
                {scopes.filter((scope) => scope.resealAvailable).map((scope) => <option key={`${scope.scope}:${scope.revealSlotId ?? ""}`} value={`${scope.scope}:${scope.revealSlotId ?? ""}`}>{scope.label} — {scope.overrideAnswerCount} overridden answers</option>)}
              </select>
            </div>
           <div className="space-y-2">
             <label className="text-sm font-bold">Reason for reseal</label>
             <Input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} placeholder="Reversing accidental unlock..." />
           </div>
           <div className="space-y-2">
             <label className="text-sm font-bold text-destructive">Type "{vaultName}" to confirm</label>
             <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} required />
           </div>
           <DialogFooter>
             <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={reseal.isPending || !scopeKey || confirmName !== vaultName || reason.length < 10}>Execute Reseal</Button>
           </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteVaultDialog({ vaultId, vaultName, exportAvailable, open, onClose, onExport }: { vaultId: string, vaultName: string, exportAvailable: boolean, open: boolean, onClose: () => void, onExport: () => void }) {
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [exportConsidered, setExportConsidered] = useState(false);
  const { data: preview } = useGetAdminVaultDeletionPreview(vaultId, { query: { enabled: open, queryKey: getGetAdminVaultDeletionPreviewQueryKey(vaultId) } });
  
  const del = useDeleteAdminVault();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== vaultName) return;

    try {
      await runSensitive(() => del.mutateAsync({ vaultId, data: { reason, confirmation: confirmName } }));
        toast({ title: "Vault Deleted", description: "The vault and all associated PII have been removed." });
        queryClient.invalidateQueries({ queryKey: getListAdminVaultsQueryKey() });
        // Can't stay on detail page
        window.location.href = "/admin/vaults";
    } catch (err: any) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          toast({ title: "Fresh MFA Required", description: "Please re-authenticate.", variant: "destructive" });
        } else {
          toast({ title: "Action Failed", description: err?.response?.data?.message || "Unknown error", variant: "destructive" });
        }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2"><Trash2 className="w-5 h-5"/> Delete Vault</DialogTitle>
          <DialogDescription>This action is irreversible and destroys all PII associated with the vault.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDelete} className="space-y-4">
           {preview && Object.keys(preview).length > 0 && (
             <div className="bg-muted p-3 rounded text-sm mb-4">
               <strong className="block mb-1">Impact:</strong>
               {Object.entries(preview).map(([k, v]) => (
                 <div key={k}>• <strong>{k}</strong>: {String(v)}</div>
               ))}
             </div>
           )}
            {exportAvailable && (
             <div className="bg-pop-tint/30 border border-pop/30 p-3 rounded text-sm mb-4 flex items-center justify-between">
                <span>This paid vault has unlocked content available for export.</span>
               <Button type="button" size="sm" variant="outline" onClick={onExport} className="bg-white">Export Now</Button>
             </div>
           )}
            {exportAvailable && <label className="flex gap-2 text-sm"><input type="checkbox" checked={exportConsidered} onChange={(event) => setExportConsidered(event.target.checked)} />I have deliberately considered the unlocked-content export opportunity.</label>}
           <div className="space-y-2">
             <label className="text-sm font-bold">Reason for deletion</label>
             <Input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} placeholder="User requested account closure..." />
           </div>
           <div className="space-y-2">
             <label className="text-sm font-bold text-destructive">Type "{vaultName}" to confirm</label>
             <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} required />
           </div>
           <DialogFooter>
             <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={del.isPending || (exportAvailable && !exportConsidered) || confirmName !== vaultName || reason.length < 10}>Execute Deletion</Button>
           </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
