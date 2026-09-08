import { useEffect, useState } from "react";
import { useListAdminContent, usePreviewAdminContentImport, useApplyAdminContentImport, useCreateAdminContentItem, useUpdateAdminContentItem, useReorderAdminContent, useSetAdminContentRetirement, getListAdminContentQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle2, AlertCircle, Search, Archive, RotateCcw, Plus, Pencil, ArrowUpDown } from "lucide-react";
import { useSensitiveAdminAction } from "@/hooks/use-sensitive-admin-action";

export function AdminContentTab() {
  const { data, isLoading } = useListAdminContent();
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");

  if (isLoading) return <div className="p-12 text-center text-text-2">Loading content...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-border p-4 rounded-xl shadow-sm gap-4">
        <div>
          <h2 className="font-bold text-ink text-lg">Content Hierarchy</h2>
          <p className="text-text-2 text-sm">Manage vault types, subcategories, questions, and options.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
            <Input 
              placeholder="Search content..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm h-9"
            />
          </div>
          <Button onClick={() => setImportOpen(true)} className="gap-2 h-9 shrink-0">
            <Upload className="w-4 h-4" /> Import Content
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ContentList title="Vault Types" kind="vault-types" items={data?.vaultTypes || []} search={search} />
        <ContentList title="Subcategories" kind="subcategories" items={data?.subcategories || []} search={search} />
        <ContentList title="Questions" kind="questions" items={data?.questions || []} search={search} />
        <ContentList title="Options" kind="options" items={data?.options || []} search={search} />
      </div>

      <ImportContentDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function ContentList({ title, kind, items, search }: { title: string, kind: "vault-types" | "subcategories" | "questions" | "options", items: any[], search: string }) {
  const retire = useSetAdminContentRetirement();
  const create = useCreateAdminContentItem();
  const update = useUpdateAdminContentItem();
  const reorder = useReorderAdminContent();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();
  const [ordered, setOrdered] = useState<any[]>(items);
  const [dirtyParent, setDirtyParent] = useState<string | null>(null);
  useEffect(() => setOrdered(items), [items]);
  const parentOf = (item: any) => kind === "subcategories" ? item.vaultTypeId : kind === "questions" ? item.subcategoryId : kind === "options" ? item.questionId : "all";
  const visible = search ? ordered.filter((item) => `${item.name ?? ""} ${item.slug ?? ""} ${item.prompt ?? ""} ${item.label ?? ""}`.toLowerCase().includes(search.toLowerCase())) : ordered;

  const handleRetireToggle = async (id: string, currentlyRetired: boolean) => {
    const reason = window.prompt(`Reason for ${currentlyRetired ? 'reactivation' : 'retirement'}:`);
    if (!reason || reason.trim().length < 5) return;
    
    try {
      await runSensitive(() => retire.mutateAsync({ kind, contentId: id, state: currentlyRetired ? 'reactivate' : 'retire', data: { reason } }));
         queryClient.invalidateQueries({ queryKey: getListAdminContentQueryKey() });
         toast({ title: currentlyRetired ? "Reactivated" : "Retired" });
    } catch (err: any) {
         if (err?.response?.status === 401 || err?.response?.status === 403) {
            toast({ title: "Fresh MFA Required", description: "Please re-authenticate.", variant: "destructive" });
         } else {
            toast({ title: "Action Failed", description: err?.response?.data?.message || "Unknown error", variant: "destructive" });
         }
    }
  };
  const mutateJson = async (operation: "create" | "edit", contentId?: string) => {
    const raw = window.prompt(`${operation === "create" ? "Create" : "Edit"} ${title}: enter supported fields as JSON (include reason).`);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (!data.reason) throw new Error("A reason is required.");
      if (operation === "create") await runSensitive(() => create.mutateAsync({ kind, data }));
      else {
        if (contentId) await runSensitive(() => update.mutateAsync({ kind, contentId, data }));
      }
      queryClient.invalidateQueries({ queryKey: getListAdminContentQueryKey() });
    } catch { toast({ title: "Invalid content JSON", description: "Provide supported fields and a reason.", variant: "destructive" }); }
  };
  const reorderItems = async () => {
    const reason = window.prompt("Reason for reorder:");
    if (!reason) return;
    if (!dirtyParent) return;
    await runSensitive(() => reorder.mutateAsync({ kind, data: { ids: ordered.filter((item) => parentOf(item) === dirtyParent).map((item) => item.id), reason } }));
    setDirtyParent(null); queryClient.invalidateQueries({ queryKey: getListAdminContentQueryKey() });
  };
  const move = (item: any, offset: number) => setOrdered((current) => {
    const siblingIndexes = current.map((candidate, index) => parentOf(candidate) === parentOf(item) ? index : -1).filter((index) => index >= 0);
    const siblingPosition = siblingIndexes.indexOf(current.findIndex((candidate) => candidate.id === item.id));
    const nextPosition = siblingPosition + offset;
    if (nextPosition < 0 || nextPosition >= siblingIndexes.length) return current;
    const from = siblingIndexes[siblingPosition]; const to = siblingIndexes[nextPosition];
    const next = [...current]; [next[from], next[to]] = [next[to], next[from]];
    setDirtyParent(parentOf(item));
    return next;
  });

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col max-h-[700px]">
      <div className="bg-muted px-4 py-3 font-bold text-ink text-sm border-b border-border flex justify-between shrink-0">
        <span>{title}</span>
        <span className="flex items-center gap-1 text-text-2"><button title="Create" onClick={() => mutateJson("create")}><Plus className="w-4 h-4" /></button><button title="Save complete sibling order" disabled={!!search || !dirtyParent} onClick={reorderItems}><ArrowUpDown className="w-3 h-3" /></button>{items.length}</span>
      </div>
      <div className="p-2 space-y-1 overflow-y-auto flex-1">
        {visible.map((item: any) => {
          const isRetired = item.isRetired === true;
          const orderIndex = ordered.findIndex((candidate) => candidate.id === item.id);
          const siblings = ordered.filter((candidate) => parentOf(candidate) === parentOf(item));
          const siblingIndex = siblings.findIndex((candidate) => candidate.id === item.id);
          return (
            <div key={item.id} className={`p-3 rounded-lg text-sm border transition-colors group relative ${isRetired ? 'bg-muted/10 border-dashed border-border text-text-2' : 'bg-muted/30 border-transparent hover:border-border'}`}>
              <div className={`font-bold ${isRetired ? 'line-through opacity-70' : 'text-ink'}`}>{item.name || item.prompt || item.label || item.slug}</div>
              <div className="text-xs font-mono mt-1 opacity-60 truncate">{item.id}</div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white p-1 rounded border shadow-sm">
                <button aria-label={`Move ${item.name || item.prompt || item.label || item.slug} up`} disabled={!!search || siblingIndex === 0} onClick={() => move(item, -1)}>↑</button>
                <button aria-label={`Move ${item.name || item.prompt || item.label || item.slug} down`} disabled={!!search || siblingIndex === siblings.length - 1} onClick={() => move(item, 1)}>↓</button>
                <button aria-label={`Edit ${item.name || item.prompt || item.label || item.slug}`} onClick={() => mutateJson("edit", item.id)}><Pencil className="w-3 h-3" /></button>
                <button 
                  onClick={() => handleRetireToggle(item.id, isRetired)}
                  className={`p-1 rounded hover:bg-muted ${isRetired ? 'text-ok' : 'text-destructive'}`}
                  title={isRetired ? "Reactivate" : "Retire"}
                  disabled={retire.isPending}
                >
                  {isRetired ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                </button>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && <div className="p-4 text-center text-text-2 text-xs">No items found.</div>}
      </div>
    </div>
  );
}

function ImportContentDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [jsonStr, setJsonStr] = useState("");
  const [reason, setReason] = useState("");
  const preview = usePreviewAdminContentImport();
  const apply = useApplyAdminContentImport();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();

  const handlePreview = async () => {
    try {
      const bank = JSON.parse(jsonStr);
      await runSensitive(() => preview.mutateAsync({ data: { bank } }));
    } catch (e) {
      toast({ title: "Invalid JSON", description: "The content provided is not valid JSON.", variant: "destructive" });
    }
  };

  const handleApply = async () => {
    if (!preview.data?.canApply || preview.data?.unresolvedCount > 0) return;
    try {
      const bank = JSON.parse(jsonStr);
      try {
        const res = await runSensitive(() => apply.mutateAsync({ data: { bank, reason } }));
          toast({ title: "Import Applied", description: `Created vault type with ${res.questionCount} questions.` });
          queryClient.invalidateQueries({ queryKey: getListAdminContentQueryKey() });
          setJsonStr("");
          setReason("");
          preview.reset();
          onClose();
      } catch (err: any) {
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            toast({ title: "Fresh MFA Required", description: "Please re-authenticate.", variant: "destructive" });
          } else {
            toast({ title: "Import Failed", description: err?.response?.data?.message || "Unknown error", variant: "destructive" });
          }
      }
    } catch (e) {}
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); preview.reset(); setJsonStr(""); setReason(""); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Import Content Bank</DialogTitle>
          <DialogDescription>Paste the complete JSON structure for a new Vault Type and its questions.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0">
          <textarea
            className="w-full h-48 border border-input rounded-md p-3 text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={`{\n  "vaultType": { "slug": "...", "name": "..." },\n  "subcategories": [...]\n}`}
            value={jsonStr}
            onChange={(e) => { setJsonStr(e.target.value); preview.reset(); }}
          />

          {!preview.data && (
            <Button onClick={handlePreview} disabled={!jsonStr.trim() || preview.isPending} className="w-full">
              {preview.isPending ? "Validating..." : "Preview Import"}
            </Button>
          )}

          {preview.data && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${preview.data.unresolvedCount > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-ok-tint border-ok/30'}`}>
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  {preview.data.unresolvedCount > 0 ? (
                    <><AlertCircle className="w-5 h-5 text-destructive" /> <span className="text-destructive">Validation Issues ({preview.data.unresolvedCount})</span></>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5 text-ok" /> <span className="text-ok">Validation Passed</span></>
                  )}
                </h3>
                
                {preview.data.issues.length > 0 && (
                  <ul className="space-y-1 text-sm text-ink max-h-40 overflow-y-auto mt-3 bg-white/50 p-2 rounded">
                    {preview.data.issues.map((iss, i) => (
                      <li key={i}><strong className="font-mono text-xs">{iss.path}:</strong> {iss.message}</li>
                    ))}
                  </ul>
                )}
              </div>

              {preview.data.canApply && preview.data.unresolvedCount === 0 && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-ink">Reason for import (Audit)</label>
                    <Input 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      placeholder="e.g. Content update for 2024 season..."
                      required
                      minLength={10}
                    />
                  </div>
                  <Button onClick={handleApply} disabled={apply.isPending || reason.trim().length < 10} className="w-full">
                    {apply.isPending ? "Applying..." : "Apply Import"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
