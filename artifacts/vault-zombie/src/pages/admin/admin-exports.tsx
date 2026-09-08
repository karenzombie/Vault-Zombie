import { useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDownloadAdminFullExport } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useSensitiveAdminAction } from "@/hooks/use-sensitive-admin-action";

export function AdminExportsTab() {
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const exportMutation = useDownloadAdminFullExport();
  const { toast } = useToast();
  const runSensitive = useSensitiveAdminAction();

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== "EXPORT SEALED DATA") return;
    
    try {
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
    </div>
  );
}
