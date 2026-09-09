import { useState } from "react";
import { useListAdminOperators, useGetAdminOperator, useGetAdminAccountDeletionPreview, useDeleteAdminAccount, useDownloadAdminVaultUnlockedExport, getDownloadAdminVaultUnlockedExportQueryKey, getListAdminOperatorsQueryKey, getGetAdminAccountDeletionPreviewQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ChevronRight, ArrowLeft, Trash2, ShieldAlert } from "lucide-react";
import { getTierLabel } from "@/lib/utils";
import { useSensitiveAdminAction } from "@/hooks/use-sensitive-admin-action";

export function AdminOperatorsTab({ operatorId }: { operatorId?: string }) {
  if (operatorId) return <OperatorDetailView operatorId={operatorId} />;
  return <OperatorListView />;
}

function OperatorListView() {
  const { data, isLoading } = useListAdminOperators();
  const [search, setSearch] = useState("");

  if (isLoading) return <div className="p-12 text-center text-text-2">Loading hosts...</div>;

  const operators = data?.operators.filter(o => 
    o.id.includes(search) || o.email.toLowerCase().includes(search.toLowerCase()) || o.displayName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white border border-border p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
          <Input 
            placeholder="Search by ID, email, or name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted text-text-2 font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4 border-b">Host / ID</th>
                <th className="px-6 py-4 border-b">Email</th>
                <th className="px-6 py-4 border-b">Vaults</th>
                <th className="px-6 py-4 border-b">Status</th>
                <th className="px-6 py-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {operators.map((op) => (
                <tr key={op.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-ink">{op.displayName}</div>
                    <div className="text-text-2 text-xs font-mono mt-1">{op.id}</div>
                  </td>
                  <td className="px-6 py-4 text-ink">{op.email}</td>
                  <td className="px-6 py-4 text-ink font-bold">{op.vaultCount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      op.status === 'active' ? 'bg-ok-tint text-ok' : 'bg-muted text-text-2'
                    }`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/operators/${op.id}`}>
                      <Button variant="ghost" size="sm" className="hover:bg-muted"><ChevronRight className="w-4 h-4" /></Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {operators.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-2">No hosts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OperatorDetailView({ operatorId }: { operatorId: string }) {
  const { data, isLoading } = useGetAdminOperator(operatorId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <div className="p-12 text-center text-text-2">Loading host detail...</div>;
  if (!data) return <div className="p-12 text-center text-destructive">Host not found.</div>;

  const { operator, vaults, billingRecords } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/operators">
          <Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="w-4 h-4"/> Back</Button>
        </Link>
        <h2 className="font-display text-2xl text-ink">Host Detail: {operator.id}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-border p-6 rounded-xl shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display text-xl text-ink">{operator.displayName}</h3>
                <div className="text-sm text-text-2 mt-1">{operator.email}</div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                operator.status === 'active' ? 'bg-ok-tint text-ok' : 'bg-muted text-text-2'
              }`}>
                {operator.status}
              </span>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-muted px-6 py-3 font-bold text-ink text-sm border-b border-border flex justify-between items-center">
              <span>Vaults ({vaults.length})</span>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted text-text-2 font-bold tracking-wider uppercase text-[10px]">
                  <tr>
                    <th className="px-6 py-3 border-b">Name</th>
                    <th className="px-6 py-3 border-b">Tier</th>
                    <th className="px-6 py-3 border-b">Status</th>
                    <th className="px-6 py-3 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {vaults.map((vault) => (
                    <tr key={vault.id} className="hover:bg-muted/30">
                      <td className="px-6 py-3 font-bold text-ink">{vault.name}</td>
                      <td className="px-6 py-3 text-xs uppercase tracking-wider">{getTierLabel(vault.planTier as any)}</td>
                      <td className="px-6 py-3 text-xs">{vault.status}</td>
                      <td className="px-6 py-3 text-right">
                        <Link href={`/admin/vaults/${vault.id}`}>
                          <Button variant="ghost" size="sm" className="hover:bg-muted text-vault-accent">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {vaults.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-text-2">No vaults.</td></tr>}
                </tbody>
               </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-destructive/5 border border-destructive/20 p-5 rounded-xl shadow-sm">
            <h3 className="font-bold text-destructive flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4" /> Admin Actions
            </h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4" /> Delete Account
              </Button>
            </div>
          </div>

          <div className="bg-white border border-border p-5 rounded-xl shadow-sm text-sm">
             <h3 className="font-bold text-ink mb-3">Billing Context</h3>
             <div className="space-y-4">
               <div>
                 <div className="text-xs text-text-2 uppercase tracking-wider font-bold mb-1">Recent Records</div>
                 {billingRecords.length > 0 ? (
                   <div className="space-y-2">
                     {billingRecords.slice(0, 5).map(r => (
                       <div key={r.id} className="flex justify-between items-center text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                         <div>
                           <div className="font-bold text-ink">{(r.amountCents/100).toFixed(2)} {r.currency.toUpperCase()}</div>
                           <div className="text-text-2">{r.targetTier}</div>
                         </div>
                         <div className="text-right">
                           <div className="font-bold">{r.status}</div>
                           <div className="text-text-2">{r.source}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : <div className="text-text-2 text-xs">None</div>}
               </div>
             </div>
          </div>
        </div>
      </div>

      <DeleteAccountDialog operatorId={operatorId} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}

function DeleteAccountDialog({ operatorId, open, onClose }: { operatorId: string, open: boolean, onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [exportsConsidered, setExportsConsidered] = useState(false);
  const { data: preview } = useGetAdminAccountDeletionPreview(operatorId, { query: { enabled: open, queryKey: getGetAdminAccountDeletionPreviewQueryKey(operatorId) } });
  
  const del = useDeleteAdminAccount();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();
  const exportVaults = ((preview as any)?.exportVaults ?? []) as Array<{ id: string; name: string; unlockedAnswerCount: number }>;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== `DELETE ${operatorId}`) return;

    try {
      await runSensitive(() => del.mutateAsync({ accountId: operatorId, data: { reason, confirmation: confirmName } }));
        toast({ title: "Account Deleted", description: "The account and all associated vaults have been removed." });
        queryClient.invalidateQueries({ queryKey: getListAdminOperatorsQueryKey() });
        window.location.href = "/admin/operators";
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
          <DialogTitle className="text-destructive flex items-center gap-2"><Trash2 className="w-5 h-5"/> Delete Host Account</DialogTitle>
          <DialogDescription>This action is irreversible and destroys all PII and vaults owned by this host.</DialogDescription>
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
            {exportVaults.length > 0 && <div className="rounded border border-pop/30 bg-pop-tint/30 p-3 text-sm space-y-2"><strong>Paid vaults with unlocked content</strong>{exportVaults.map((vault) => <AccountVaultExport key={vault.id} vault={vault} />)}<label className="flex gap-2"><input type="checkbox" checked={exportsConsidered} onChange={(event) => setExportsConsidered(event.target.checked)} />I have deliberately considered every export opportunity.</label></div>}
           <div className="space-y-2">
             <label className="text-sm font-bold">Reason for deletion</label>
             <Input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} placeholder="User requested account closure..." />
           </div>
           <div className="space-y-2">
              <label className="text-sm font-bold text-destructive">Type "DELETE {operatorId}" to confirm</label>
             <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} required />
           </div>
           <DialogFooter>
             <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={del.isPending || (exportVaults.length > 0 && !exportsConsidered) || confirmName !== `DELETE ${operatorId}` || reason.length < 10}>Execute Deletion</Button>
           </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountVaultExport({ vault }: { vault: { id: string; name: string; unlockedAnswerCount: number } }) {
  const download = useDownloadAdminVaultUnlockedExport(vault.id, { query: { enabled: false, queryKey: getDownloadAdminVaultUnlockedExportQueryKey(vault.id) } });
  const runSensitive = useSensitiveAdminAction();
  const handleDownload = async () => {
    const response = await runSensitive(() => download.refetch().then((result) => {
      if (result.error) throw result.error;
      return result;
    }));
    if (!response.data) return;
    const url = URL.createObjectURL(response.data);
    const link = Object.assign(document.createElement("a"), { href: url, download: `vault-${vault.id}-unlocked.csv` });
    link.click(); URL.revokeObjectURL(url);
  };
  return <div className="flex items-center justify-between gap-2"><span>{vault.name} ({vault.unlockedAnswerCount})</span><Button type="button" size="sm" variant="outline" onClick={handleDownload}>Export</Button></div>;
}
