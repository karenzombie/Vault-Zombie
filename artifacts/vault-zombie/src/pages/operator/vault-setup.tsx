import { useEffect, useMemo, useRef, useState } from "react";
import { Redirect, useLocation } from "wouter";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useGetVaultSetupDetail,
  useUpdateVaultSetup,
  usePreviewVaultSchedule,
  useListVaultPrompts,
  useAddCustomPrompt,
  useToggleVaultPrompt,
  useReorderVaultPrompts,
  useUploadVaultCover,
  useRemoveVaultCover,
  useUpdateVaultGuestLayout,
  useGetSealReadiness,
  useSealVaultAction,
  getListVaultPromptsQueryKey,
  getGetVaultSetupDetailQueryKey,
  type VaultPrompt,
  type RevealSlotPreview,
  type SchedulePreviewInputSchedule,
  type GuestLayoutInputGuestLayout,
} from "@workspace/api-client-react";
import { PLAN_POLICY, type RevealSchedule } from "@workspace/db/schedule";
import { substituteTokens } from "@workspace/shared";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, GripVertical, Plus } from "lucide-react";
import { getTierLabel } from "@/lib/utils";
import { VAULT_ART } from "./operator-page";
import { ShareLinkPanel } from "./vault-share";

/**
 * /operator/vaults/:vaultId/setup (Flow1 Build Stages 3.1-3.4). Draft-only
 * vault setup: event date, the Deep Vault milestone, reveal schedule with a
 * live preview, and prompt selection with custom prompts and drag reorder.
 * Every field autosaves; there is no separate save step.
 */

const SCHEDULE_INFO: Record<RevealSchedule, { name: string; desc: string }> = {
  weekly_sprint: { name: "Weekly Sprint", desc: "A reveal every week for 8 weeks. Best for short, fun events." },
  monthly_x3: { name: "Monthly x3", desc: "A reveal each month for 3 months. The free tier taste." },
  monthly_year: { name: "Monthly Year", desc: "A reveal every month for 13 months. A full first-year ritual." },
  half_then_annual: { name: "Half-then-Annual", desc: "One reveal at 6 months, then every anniversary. For early payoff." },
  annual_keepsake: { name: "Annual Keepsake", desc: "A reveal every year up to the plan limit. Classic long-range life vault." },
};

const SCHEDULE_ORDER: RevealSchedule[] = ["weekly_sprint", "monthly_x3", "monthly_year", "half_then_annual", "annual_keepsake"];

function formatSlotDate(value: string): string {
  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function VaultSetupPage({ vaultId }: { vaultId: string }) {
  const [, setLocation] = useLocation();
  const detail = useGetVaultSetupDetail(vaultId);

  if (detail.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <SiteHeader />
        <p className="text-center text-text-2 text-lg py-16">Loading your vault…</p>
      </div>
    );
  }

  if (detail.isError) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <SiteHeader />
        <p className="text-center text-destructive text-lg py-16">Unable to load this vault.</p>
      </div>
    );
  }

  if (detail.data && detail.data.status !== "draft") {
    return <Redirect to={`/operator/vaults/${vaultId}`} />;
  }

  if (!detail.data) return null;

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <div className="max-w-3xl mx-auto p-4 md:p-10">
        <h1 className="font-display text-4xl text-ink mb-1">{detail.data.name}</h1>
        <p className="text-text-2 mb-8">{getTierLabel(detail.data.planTier)} · {detail.data.vaultTypeName}</p>

        <EventDateSection vaultId={vaultId} detail={detail.data} />
        {detail.data.planTier === "deep_vault" && <MilestoneSection vaultId={vaultId} detail={detail.data} />}
        <CoverSection vaultId={vaultId} detail={detail.data} />
        <GuestLayoutSection vaultId={vaultId} guestLayout={detail.data.guestLayout} />
        <ScheduleSection vaultId={vaultId} detail={detail.data} />
        <PromptsSection vaultId={vaultId} subjectValues={detail.data.subjectValues} />
        <SealSection vaultId={vaultId} vaultName={detail.data.name} />

        <div className="flex justify-end mt-10">
          <Button data-testid="button-setup-done" onClick={() => setLocation(`/operator/vaults/${vaultId}`)}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

const SCHEDULE_NAME_LOOKUP = SCHEDULE_INFO;

/** 5.3: the Seal this vault button, its confirmation box, the seal animation,
 * and the sealed confirmation. Once a vault is sealed this section replaces
 * itself with the guest link, QR code, and print buttons, matching the
 * share screen (5.1) it is reachable from. */
function SealSection({ vaultId, vaultName }: { vaultId: string; vaultName: string }) {
  const queryClient = useQueryClient();
  const readiness = useGetSealReadiness(vaultId);
  const seal = useSealVaultAction();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "sealing" | "sealed">("idle");
  const [sealedToken, setSealedToken] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  if (phase === "sealed" && sealedToken) {
    return (
      <SectionCard title="Your vault is sealed">
        <ShareLinkPanel vaultName={vaultName} guestToken={sealedToken} />
      </SectionCard>
    );
  }

  const r = readiness.data;
  const scheduleName = r?.scheduleName ? SCHEDULE_NAME_LOOKUP[r.scheduleName as RevealSchedule]?.name ?? r.scheduleName : "";
  const tierName = r?.tierName ? getTierLabel(r.tierName) : "";

  function handleSeal() {
    seal.mutate(
      { vaultId },
      {
        onSuccess: (res) => {
          setConfirmOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetVaultSetupDetailQueryKey(vaultId) });
          setSealedToken(res.guestToken);
          if (reduceMotion) {
            setPhase("sealed");
          } else {
            setPhase("sealing");
            setTimeout(() => setPhase("sealed"), 1200);
          }
        },
      },
    );
  }

  if (phase === "sealing") {
    return (
      <SectionCard title="Sealing your vault">
        <div className="flex flex-col items-center py-10">
          <motion.img
            src={`${import.meta.env.BASE_URL}vault_zombie_png.png`}
            alt=""
            className="h-20 w-auto"
            initial={{ rotate: 0, scale: 1 }}
            animate={{ rotate: [0, -6, 0], scale: [1, 0.94, 1] }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
          <p className="text-sm text-text-2 mt-4">Sealing your vault…</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Seal this vault">
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button data-testid="button-seal-vault" disabled={!r || !r.ready}>
            Seal this vault
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to seal?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left space-y-3 text-text-2">
                <p>Once you seal, these are locked for good:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your {r?.promptCount ?? 0} prompts</li>
                  <li>Your reveal schedule, {scheduleName}</li>
                  <li>Your plan, {tierName}</li>
                  <li>
                    Your reveal dates: {r?.firstRevealDate ? formatSlotDate(r.firstRevealDate) : "—"} through{" "}
                    {r?.lastRevealDate ? formatSlotDate(r.lastRevealDate) : "—"}
                  </li>
                </ul>
                <p>You can still change your event date, your cover, and how guests see the prompts.</p>
                <p>Guests can start answering the moment you seal.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-seal">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-seal" onClick={handleSeal} disabled={seal.isPending}>
              Seal it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {r && !r.ready && (
        <p className="text-sm text-destructive mt-3" data-testid="text-seal-disabled-reason">
          {r.reasons[0]}
        </p>
      )}
    </SectionCard>
  );
}

function SectionCard({ title, helper, children }: { title: string; helper?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
      <h2 className="font-display text-2xl text-ink mb-2">{title}</h2>
      {helper && <p className="text-sm text-text-2 mb-5">{helper}</p>}
      {children}
    </section>
  );
}

function EventDateSection({ vaultId, detail }: { vaultId: string; detail: { anchorDate: string | null; planTier: any; revealSchedule: string | null; milestoneDate: string | null; milestoneLabel: string | null } }) {
  const queryClient = useQueryClient();
  const update = useUpdateVaultSetup();
  const [anchorDate, setAnchorDate] = useState(detail.anchorDate ?? "");
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current) {
      setAnchorDate(detail.anchorDate ?? "");
      seeded.current = true;
    }
  }, [detail.anchorDate]);

  function save(nextAnchorDate: string) {
    update.mutate(
      {
        vaultId,
        data: {
          planTier: detail.planTier,
          revealSchedule: (detail.revealSchedule as any) ?? null,
          anchorDate: nextAnchorDate || null,
          milestoneDate: detail.milestoneDate ?? null,
          milestoneLabel: detail.milestoneLabel ?? null,
        },
      },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultSetupDetailQueryKey(vaultId) }) },
    );
  }

  return (
    <SectionCard title="When's the big day?" helper="Your reveal dates count forward from this day. Leave it blank and they count from the day you seal.">
      <div className="max-w-xs">
        <Label htmlFor="event-date">Event date</Label>
        <Input
          id="event-date"
          data-testid="input-event-date"
          type="date"
          value={anchorDate}
          onChange={(e) => {
            setAnchorDate(e.target.value);
            save(e.target.value);
          }}
        />
      </div>
    </SectionCard>
  );
}

function MilestoneSection({ vaultId, detail }: { vaultId: string; detail: { anchorDate: string | null; planTier: any; revealSchedule: string | null; milestoneDate: string | null; milestoneLabel: string | null } }) {
  const queryClient = useQueryClient();
  const update = useUpdateVaultSetup();
  const [milestoneDate, setMilestoneDate] = useState(detail.milestoneDate ?? "");
  const [milestoneLabel, setMilestoneLabel] = useState(detail.milestoneLabel ?? "");
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current) {
      setMilestoneDate(detail.milestoneDate ?? "");
      setMilestoneLabel(detail.milestoneLabel ?? "");
      seeded.current = true;
    }
  }, [detail.milestoneDate, detail.milestoneLabel]);

  function save(nextDate: string, nextLabel: string) {
    update.mutate(
      {
        vaultId,
        data: {
          planTier: detail.planTier,
          revealSchedule: (detail.revealSchedule as any) ?? null,
          anchorDate: detail.anchorDate ?? null,
          milestoneDate: nextDate || null,
          milestoneLabel: nextLabel || null,
        },
      },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultSetupDetailQueryKey(vaultId) }) },
    );
  }

  return (
    <SectionCard title="Milestone reveal" helper="Deep Vault includes one milestone reveal, a date that matters more than the rest. A tenth anniversary, a graduation, a birthday worth waiting for.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="milestone-date">Your milestone date</Label>
          <Input
            id="milestone-date"
            data-testid="input-milestone-date"
            type="date"
            value={milestoneDate}
            onChange={(e) => {
              setMilestoneDate(e.target.value);
              save(e.target.value, milestoneLabel);
            }}
          />
        </div>
        <div>
          <Label htmlFor="milestone-label">What are we celebrating?</Label>
          <Input
            id="milestone-label"
            data-testid="input-milestone-label"
            maxLength={60}
            value={milestoneLabel}
            onChange={(e) => {
              setMilestoneLabel(e.target.value);
              save(milestoneDate, e.target.value);
            }}
          />
        </div>
      </div>
    </SectionCard>
  );
}

const ACCEPTED_COVER_TYPES = "image/jpeg,image/png";

/**
 * Stage 4.1. Every vault has a cover: the vault type's silhouette by
 * default, or an uploaded photo on a paid tier. Lockbox gets no upload
 * control at all, not even a disabled one, so it only ever sees the
 * silhouette here.
 */
function CoverSection({ vaultId, detail }: { vaultId: string; detail: { planTier: any; vaultTypeSlug: string; coverObjectKey: string | null } }) {
  const queryClient = useQueryClient();
  const upload = useUploadVaultCover();
  const remove = useRemoveVaultCover();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const isLockbox = detail.planTier === "lockbox";
  const silhouette = VAULT_ART[detail.vaultTypeSlug];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetVaultSetupDetailQueryKey(vaultId) });
  }

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    upload.mutate(
      { vaultId, data: file },
      {
        onSuccess: invalidate,
        onError: (err: any) => setError(err?.message ?? "Could not upload that photo."),
      },
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemove() {
    setError(null);
    remove.mutate({ vaultId }, { onSuccess: invalidate, onError: (err: any) => setError(err?.message ?? "Could not remove the photo.") });
  }

  const coverSrc = detail.coverObjectKey
    ? `/api/storage${detail.coverObjectKey}`
    : silhouette
      ? `${import.meta.env.BASE_URL}vault-art/${silhouette}`
      : null;

  return (
    <SectionCard title="Your cover">
      {isLockbox ? (
        <div className="flex flex-col gap-3">
          <div className="w-24 h-24 rounded-xl border border-border bg-bronze-wash/40 flex items-center justify-center overflow-hidden shrink-0">
            {coverSrc ? (
              <img src={coverSrc} alt="" className="w-full h-full object-cover" data-testid="img-vault-cover" />
            ) : (
              <span className="text-xs text-gray">No image</span>
            )}
          </div>
          <p className="text-sm text-text-2">Upgrade to any paid plan to use your own photo.</p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-xl border border-border bg-bronze-wash/40 flex items-center justify-center overflow-hidden shrink-0">
            {coverSrc ? (
              <img src={coverSrc} alt="" className="w-full h-full object-cover" data-testid="img-vault-cover" />
            ) : (
              <span className="text-xs text-gray">No image</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-2 mb-3">{detail.coverObjectKey ? "Your uploaded photo." : "Your vault type's default cover."}</p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_COVER_TYPES}
                data-testid="input-cover-file"
                onChange={(e) => handleFile(e.target.files?.[0])}
                disabled={upload.isPending}
              />
              {detail.coverObjectKey && (
                <Button type="button" variant="secondary" size="sm" data-testid="button-remove-cover" disabled={remove.isPending} onClick={handleRemove}>
                  {remove.isPending ? "Removing…" : "Remove photo"}
                </Button>
              )}
            </div>
            {upload.isPending && <p className="text-xs text-text-2 mt-2">Uploading…</p>}
            {error && <p className="text-sm text-destructive mt-2" data-testid="text-cover-error">{error}</p>}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

const GUEST_LAYOUT_OPTIONS: { value: GuestLayoutInputGuestLayout; name: string; desc: string }[] = [
  { value: "one_at_a_time", name: "One prompt at a time", desc: "One prompt per screen with a progress indicator. Best for phones at an event." },
  { value: "all_prompts", name: "All on one page", desc: "Every prompt on one scrolling page with a single submit. Best for a laptop." },
];

/** Stage 4.2. Changeable at any time, including after the vault is sealed (see the sealed-page copy of this control in operator-page.tsx). */
function GuestLayoutSection({ vaultId, guestLayout }: { vaultId: string; guestLayout: GuestLayoutInputGuestLayout }) {
  const queryClient = useQueryClient();
  const update = useUpdateVaultGuestLayout();

  function choose(next: GuestLayoutInputGuestLayout) {
    update.mutate(
      { vaultId, data: { guestLayout: next } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultSetupDetailQueryKey(vaultId) }) },
    );
  }

  return (
    <SectionCard title="How your guests see the prompts">
      <RadioGroup value={guestLayout} onValueChange={(v) => choose(v as GuestLayoutInputGuestLayout)} className="gap-3">
        {GUEST_LAYOUT_OPTIONS.map((option) => (
          <label
            key={option.value}
            data-testid={`option-guest-layout-${option.value}`}
            className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${guestLayout === option.value ? "border-vault-accent bg-bronze-wash/30" : "border-border hover:bg-muted/50"}`}
          >
            <RadioGroupItem value={option.value} id={`guest-layout-${option.value}`} className="mt-1" />
            <div>
              <p className="font-bold text-ink">{option.name}</p>
              <p className="text-sm text-text-2">{option.desc}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </SectionCard>
  );
}

function ScheduleSection({ vaultId, detail }: { vaultId: string; detail: { anchorDate: string | null; planTier: any; revealSchedule: string | null; milestoneDate: string | null; milestoneLabel: string | null } }) {
  const queryClient = useQueryClient();
  const update = useUpdateVaultSetup();
  const preview = usePreviewVaultSchedule();
  const [schedule, setSchedule] = useState<RevealSchedule | "">((detail.revealSchedule as RevealSchedule) ?? "");
  const seeded = useRef(false);
  const allowed = PLAN_POLICY[detail.planTier as keyof typeof PLAN_POLICY].schedules;

  useEffect(() => {
    if (!seeded.current) {
      setSchedule((detail.revealSchedule as RevealSchedule) ?? "");
      seeded.current = true;
    }
  }, [detail.revealSchedule]);

  useEffect(() => {
    if (!schedule) return;
    preview.mutate({
      vaultId,
      data: {
        planTier: detail.planTier,
        schedule: schedule as SchedulePreviewInputSchedule,
        anchorDate: detail.anchorDate ?? new Date().toISOString().slice(0, 10),
        milestoneDate: detail.milestoneDate ?? null,
        milestoneLabel: detail.milestoneLabel ?? null,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, detail.anchorDate, detail.milestoneDate, detail.milestoneLabel]);

  function choose(next: RevealSchedule) {
    setSchedule(next);
    update.mutate(
      {
        vaultId,
        data: {
          planTier: detail.planTier,
          revealSchedule: next,
          anchorDate: detail.anchorDate ?? null,
          milestoneDate: detail.milestoneDate ?? null,
          milestoneLabel: detail.milestoneLabel ?? null,
        },
      },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultSetupDetailQueryKey(vaultId) }) },
    );
  }

  const slots: RevealSlotPreview[] = preview.data?.revealSlots ?? [];

  return (
    <SectionCard title="How should the reveals roll out?">
      <RadioGroup value={schedule} onValueChange={(v) => choose(v as RevealSchedule)} className="gap-3">
        {SCHEDULE_ORDER.filter((s) => allowed.includes(s)).map((s) => (
          <label
            key={s}
            data-testid={`option-schedule-${s}`}
            className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${schedule === s ? "border-vault-accent bg-bronze-wash/30" : "border-border hover:bg-muted/50"}`}
          >
            <RadioGroupItem value={s} id={`schedule-${s}`} className="mt-1" />
            <div>
              <p className="font-bold text-ink">{SCHEDULE_INFO[s].name}</p>
              <p className="text-sm text-text-2">{SCHEDULE_INFO[s].desc}</p>
            </div>
          </label>
        ))}
      </RadioGroup>

      {schedule && (
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray mb-2">Reveal dates</p>
          {preview.isPending ? (
            <p className="text-sm text-text-2">Calculating…</p>
          ) : (
            <ul className="text-sm text-ink space-y-1">
              {slots.map((slot, i) => (
                <li key={i} data-testid={`text-preview-slot-${i}`}>
                  {slot.label}: {formatSlotDate(slot.revealDate)}
                  {slot.kind === "milestone" && <span className="text-bronze font-bold"> · Milestone</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function SortablePromptRow({ prompt, onToggle, subjectValues }: { prompt: VaultPrompt; onToggle: (id: string, enabled: boolean) => void; subjectValues?: Record<string, string> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: prompt.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`row-prompt-${prompt.id}`}
      className="flex items-center gap-3 rounded-lg border border-hairline bg-background p-3"
    >
      <button type="button" aria-label="Drag to reorder" className="cursor-grab text-gray shrink-0 touch-none" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">{substituteTokens(prompt.prompt, { subjectValues })}</p>
        {prompt.isCustom && (
          <p className="text-xs text-gray">{prompt.freeTextMode === "scoreable" ? "Scoreable" : "Keepsake"}</p>
        )}
      </div>
      <Switch
        data-testid={`switch-prompt-${prompt.id}`}
        checked={prompt.enabled}
        onCheckedChange={(checked) => onToggle(prompt.id, checked)}
      />
    </div>
  );
}

/**
 * A group in the prompts list: the host's own prompts, or one bank
 * sub-category. Groups are a fixed data property (isCustom, or the bank
 * question's subcategoryId), never a position, so dragging cannot move a
 * prompt between groups. handleDragEnd below ignores any drop whose target
 * lands in a different group instead of silently collapsing back to a flat
 * list.
 */
type PromptGroup = { key: string; title: string; prompts: VaultPrompt[] };

function buildPromptGroups(prompts: VaultPrompt[]): PromptGroup[] {
  const custom = prompts.filter((p) => p.isCustom).sort((a, b) => a.displayOrder - b.displayOrder);
  const bankBySubcategory = new Map<string, VaultPrompt[]>();
  for (const p of prompts) {
    if (p.isCustom) continue;
    const key = p.subcategoryId ?? "uncategorized";
    if (!bankBySubcategory.has(key)) bankBySubcategory.set(key, []);
    bankBySubcategory.get(key)!.push(p);
  }
  const bankGroups = Array.from(bankBySubcategory.entries())
    .map(([key, items]) => ({
      key,
      title: items[0]?.subcategoryName ?? "Other",
      order: items[0]?.subcategoryDisplayOrder ?? Number.MAX_SAFE_INTEGER,
      prompts: [...items].sort((a, b) => a.displayOrder - b.displayOrder),
    }))
    .sort((a, b) => a.order - b.order);

  const groups: PromptGroup[] = [];
  if (custom.length) groups.push({ key: "custom", title: "Your prompts", prompts: custom });
  for (const g of bankGroups) groups.push({ key: g.key, title: g.title, prompts: g.prompts });
  return groups;
}

/**
 * The host's own prompts group is never collapsible, so it can never end up
 * buried the way a bank sub-category group can. Only bank groups take
 * onToggleOpen; passing null marks a group as always open.
 */
function PromptGroupBlock({
  group,
  onToggle,
  isOpen,
  onToggleOpen,
  subjectValues,
}: {
  group: PromptGroup;
  onToggle: (id: string, enabled: boolean) => void;
  isOpen: boolean;
  onToggleOpen: (() => void) | null;
  subjectValues?: Record<string, string>;
}) {
  const enabledCount = group.prompts.filter((p) => p.enabled).length;

  return (
    <div className="mb-5" data-testid={`group-prompts-${group.key}`}>
      {onToggleOpen ? (
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          data-testid={`button-group-toggle-${group.key}`}
          className="flex items-center gap-1.5 w-full text-left mb-2"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray shrink-0" />
          )}
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray">{group.title}</h3>
          <span className="text-xs text-gray" data-testid={`text-group-count-${group.key}`}>
            · {enabledCount} on
          </span>
        </button>
      ) : (
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray mb-2">{group.title}</h3>
      )}
      {isOpen && (
        <SortableContext items={group.prompts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {group.prompts.map((p) => (
              <SortablePromptRow key={p.id} prompt={p} onToggle={onToggle} subjectValues={subjectValues} />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

function PromptsSection({ vaultId, subjectValues }: { vaultId: string; subjectValues?: Record<string, string> }) {
  const queryClient = useQueryClient();
  const list = useListVaultPrompts(vaultId);
  const toggle = useToggleVaultPrompt();
  const reorder = useReorderVaultPrompts();
  const addCustom = useAddCustomPrompt();

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customMode, setCustomMode] = useState<"scoreable" | "keepsake">("scoreable");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Bank sub-category groups start collapsed; a group the host opens stays
  // open for the rest of this visit. This is display state only and does
  // not need to survive leaving and coming back to the screen.
  const [openGroupKeys, setOpenGroupKeys] = useState<Set<string>>(new Set());

  function toggleGroupOpen(key: string) {
    setOpenGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const prompts = useMemo(() => [...(list.data?.prompts ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [list.data]);
  const groups = useMemo(() => buildPromptGroups(prompts), [prompts]);
  const idToGroupKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) for (const p of g.prompts) map.set(p.id, g.key);
    return map;
  }, [groups]);
  const onCount = prompts.filter((p) => p.enabled).length;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListVaultPromptsQueryKey(vaultId) });
  }

  function handleToggle(vaultQuestionId: string, enabled: boolean) {
    toggle.mutate({ vaultId, vaultQuestionId, data: { enabled } }, { onSuccess: invalidate });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeGroupKey = idToGroupKey.get(active.id as string);
    const overGroupKey = idToGroupKey.get(over.id as string);
    // A prompt's group comes from its own data (custom, or its bank
    // sub-category), never from where it sits, so a drop that lands in a
    // different group has no meaning. Ignore it rather than moving the
    // prompt or falling back to a flat order.
    if (!activeGroupKey || activeGroupKey !== overGroupKey) return;
    const group = groups.find((g) => g.key === activeGroupKey);
    if (!group) return;
    const oldIndex = group.prompts.findIndex((p) => p.id === active.id);
    const newIndex = group.prompts.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedGroupPrompts = arrayMove(group.prompts, oldIndex, newIndex);
    const orderedIds = groups.flatMap((g) => (g.key === activeGroupKey ? reorderedGroupPrompts : g.prompts).map((p) => p.id));
    reorder.mutate(
      { vaultId, data: { orderedVaultQuestionIds: orderedIds } },
      { onSuccess: invalidate },
    );
  }

  function handleAddCustom() {
    if (!customText.trim()) return;
    addCustom.mutate(
      { vaultId, data: { prompt: customText.trim(), freeTextMode: customMode } },
      {
        onSuccess: () => {
          invalidate();
          setCustomText("");
          setShowAddCustom(false);
        },
      },
    );
  }

  return (
    <SectionCard title="Choose your prompts" helper="We've picked a starter set for you. Turn prompts on or off, add your own, and drag to reorder.">
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="secondary"
          data-testid="button-add-custom-prompt"
          onClick={() => setShowAddCustom((v) => !v)}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add your own prompt
        </Button>
        <p className="text-sm font-bold text-ink" data-testid="text-prompt-count">{onCount} on</p>
      </div>

      {(onCount >= 31) && (
        <p className={`text-sm mb-4 rounded-lg p-3 ${onCount >= 41 ? "bg-warn-tint text-warn" : "bg-bronze-wash/40 text-ink"}`} data-testid="text-prompt-count-guidance">
          {onCount >= 41
            ? "This is a lot to ask of a guest. Consider trimming before you seal."
            : "That's a long list. Guests answer in about a minute, so 20 or so keeps them going to the end."}
        </p>
      )}

      {showAddCustom && (
        <div className="border border-border rounded-xl p-4 mb-5 space-y-3">
          <div>
            <Label htmlFor="custom-prompt-text">Your prompt</Label>
            <Textarea
              id="custom-prompt-text"
              data-testid="input-custom-prompt-text"
              maxLength={140}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
            <p className="text-xs text-gray text-right mt-1">{customText.length}/140</p>
          </div>
          <div>
            <RadioGroup value={customMode} onValueChange={(v) => setCustomMode(v as "scoreable" | "keepsake")} className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="scoreable" id="mode-scoreable" />
                <span className="text-sm text-ink">Scoreable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="keepsake" id="mode-keepsake" />
                <span className="text-sm text-ink">Keepsake</span>
              </label>
            </RadioGroup>
            <p className="text-xs text-text-2 mt-2">Scoreable prompts have a real answer you'll mark later. Keepsake prompts are just for the memories.</p>
          </div>
          <Button type="button" data-testid="button-save-custom-prompt" onClick={handleAddCustom} disabled={addCustom.isPending || !customText.trim()}>
            {addCustom.isPending ? "Adding…" : "Add prompt"}
          </Button>
        </div>
      )}

      {list.isLoading ? (
        <p className="text-sm text-text-2">Loading prompts…</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {groups.map((group) => (
            <PromptGroupBlock
              key={group.key}
              group={group}
              onToggle={handleToggle}
              isOpen={group.key === "custom" ? true : openGroupKeys.has(group.key)}
              onToggleOpen={group.key === "custom" ? null : () => toggleGroupOpen(group.key)}
              subjectValues={subjectValues}
            />
          ))}
        </DndContext>
      )}
    </SectionCard>
  );
}
