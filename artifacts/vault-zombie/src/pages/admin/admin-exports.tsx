import { useState } from "react";
import { Download, ShieldAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDownloadAdminFullExport, usePushAdminBackup } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useSensitiveAdminAction } from "@/hooks/use-sensitive-admin-action";

const BACKUP_REQUEST_KEY = "vault-zombie:admin-backup:outstanding-request-id";
function outstandingBackupRequestId() {
  const stored = localStorage.getItem(BACKUP_REQUEST_KEY);
  if (stored && /^[0-9a-f-]{36}$/i.test(stored)) return stored;
  const created = crypto.randomUUID();
  localStorage.setItem(BACKUP_REQUEST_KEY, created);
  return created;
}

export function AdminExportsTab() {
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [backupReason, setBackupReason] = useState("");
  const [backupConfirmation, setBackupConfirmation] = useState("");
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const [backupRequestId, setBackupRequestId] = useState(outstandingBackupRequestId);
  const [backupResult, setBackupResult] = useState<{ requestId: string; snapshotId: string; repository: string; branch?: string | null; commitSha?: string | null; tableCount?: number | null; rowCount?: number | null; artifactCount?: number | null } | null>(null);
  const exportMutation = useDownloadAdminFullExport();
  const backupMutation = usePushAdminBackup();
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== "EXPORT SEALED DATA") return;
    
    try {
      localStorage.setItem(BACKUP_REQUEST_KEY, backupRequestId);
      const file = await runSensitive(() => exportMutation.mutateAsync({ data: { confirmation: confirmName, reason } }));
        const url = URL.createObjectURL(file);
        const link = Object.assign(document.createElement("a"), { href: url, download: "vault-zombie-full-sealed-export.csv" });
        link.click(); URL.revokeObjectURL(url);
        toast({ title: "Export Complete", description: "The full system CSV export has been downloaded." });
        setReason(""); setConfirmName("");
    } catch {
      toast({ title: "Export Failed", description: "The export could not be created.", variant: "destructive" });
    }
  };
  const handleBackup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (backupConfirmation !== "PUSH BACKUP" || !finalConfirmation) return;
    try {
      const result = await runSensitive(() => backupMutation.mutateAsync({
        data: { reason: backupReason, confirmation: backupConfirmation, plaintextHistoryAcknowledged: true, requestId: backupRequestId },
      }));
      setBackupResult(result);
      setBackupReason(""); setBackupConfirmation(""); setFinalConfirmation(false);
      localStorage.removeItem(BACKUP_REQUEST_KEY);
      setBackupRequestId(crypto.randomUUID());
      toast({ title: "Backup pushed", description: `Snapshot ${result.snapshotId} was committed to the private backup repository.` });
    } catch (error) {
      const message = error && typeof error === "object" && "data" in error
        ? String((error as { data?: { error?: string } }).data?.error ?? "The backup could not be pushed.") : "The backup could not be pushed.";
      toast({ title: "Backup failed", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-xl bg-destructive/5 border border-destructive/20 rounded-xl p-6 shadow-sm">
        <h2 className="font-display text-2xl text-destructive flex items-center gap-2 mb-2">
          <ShieldAlert className="w-6 h-6" /> Full System Export
        </h2>
        <p className="text-destructive/80 mb-6 text-sm">
          This is a highly privileged, isolated action. It will export ALL sealed and unsealed vault data across the entire system.
          It requires a fresh MFA session, an audit reason, and the exact confirmation text.
        </p>
        
        <form onSubmit={handleExport} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Reason (Internal Audit)</label>
            <Input 
              placeholder="e.g. Legal compliance request #8842..." 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-destructive">Type "EXPORT SEALED DATA" to confirm</label>
            <Input 
              value={confirmName} 
              onChange={(e) => setConfirmName(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={exportMutation.isPending || confirmName !== "EXPORT SEALED DATA" || reason.trim().length < 10} 
            variant="destructive"
            className="w-full mt-2 gap-2"
          >
            <Download className="w-4 h-4" /> {exportMutation.isPending ? "Processing Export..." : "Download Full Export"}
          </Button>
        </form>
      </div>
      <div className="max-w-xl bg-destructive/5 border border-destructive/20 rounded-xl p-6 shadow-sm">
        <h2 className="font-display text-2xl text-destructive flex items-center gap-2 mb-2">
          <Upload className="w-6 h-6" /> Manual Backup
        </h2>
        <p className="text-destructive/80 mb-4 text-sm">
          Pushes a full restore-ready database dump and readable table CSVs to the configured dedicated private repository. Sealed answers are plaintext there; anyone with repository access can read them. Git history retains deleted data by design. No backup download is created here.
        </p>
        <p className="mb-4 text-xs text-muted-foreground">Recovery request ID: {backupRequestId}. This ID is retained across reloads until the server acknowledges success.</p>
        <form onSubmit={handleBackup} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-bold text-ink">Reason (Internal Audit)</label>
            <Input value={backupReason} onChange={(event) => setBackupReason(event.target.value)} required minLength={10} />
          </div>
          <div className="space-y-2"><label className="text-sm font-bold text-destructive">Type "PUSH BACKUP" to confirm</label>
            <Input value={backupConfirmation} onChange={(event) => setBackupConfirmation(event.target.value)} required />
          </div>
          <label className="flex gap-2 text-sm text-ink"><input type="checkbox" checked={finalConfirmation} onChange={(event) => setFinalConfirmation(event.target.checked)} /> I understand this creates a plaintext sealed-data backup in private Git history.</label>
          <Button type="submit" disabled={backupMutation.isPending || backupConfirmation !== "PUSH BACKUP" || backupReason.trim().length < 10 || !finalConfirmation} variant="destructive" className="w-full gap-2">
            <Upload className="w-4 h-4" /> {backupMutation.isPending ? "Pushing Backup..." : "Push Backup Now"}
          </Button>
        </form>
        {backupResult && <p className="mt-4 text-sm text-ink">Committed snapshot {backupResult.snapshotId} to {backupResult.repository} ({backupResult.branch ?? "branch"} · {backupResult.commitSha ?? "commit"}). Request {backupResult.requestId}. {backupResult.tableCount ?? 0} tables / {backupResult.rowCount ?? 0} rows / {backupResult.artifactCount ?? 0} artifacts.</p>}
      </div>
    </div>
  );
}
