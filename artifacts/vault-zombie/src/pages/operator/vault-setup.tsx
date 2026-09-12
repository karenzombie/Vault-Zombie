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
  getListVaultPromptsQueryKey,
  getGetVaultSetupDetailQueryKey,
  type VaultPrompt,
  type RevealSlotPreview,
  type SchedulePreviewInputSchedule,
} from "@workspace/api-client-react";
import { PLAN_POLICY, type RevealSchedule } from "@workspace/db/schedule";
import { useQueryClient } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Plus } from "lucide-react";
import { getTierLabel } from "@/lib/utils";

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
        <ScheduleSection vaultId={vaultId} detail={detail.data} />
        <PromptsSection vaultId={vaultId} />

        <div className="flex justify-end mt-10">
          <Button data-testid="button-setup-done" onClick={() => setLocation(`/operator/vaults/${vaultId}`)}>
            Continue
          </Button>
        </div>
      </div>
    </div>
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

function SortablePromptRow({ prompt, onToggle }: { prompt: VaultPrompt; onToggle: (id: string, enabled: boolean) => void }) {
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
        <p className="text-sm text-ink truncate">{prompt.prompt}</p>
        <p className="text-xs text-gray">
          {prompt.isCustom ? `Your prompt · ${prompt.freeTextMode === "scoreable" ? "Scoreable" : "Keepsake"}` : prompt.subcategoryName ?? ""}
        </p>
      </div>
      <Switch
        data-testid={`switch-prompt-${prompt.id}`}
        checked={prompt.enabled}
        onCheckedChange={(checked) => onToggle(prompt.id, checked)}
      />
    </div>
  );
}

function PromptsSection({ vaultId }: { vaultId: string }) {
  const queryClient = useQueryClient();
  const list = useListVaultPrompts(vaultId);
  const toggle = useToggleVaultPrompt();
  const reorder = useReorderVaultPrompts();
  const addCustom = useAddCustomPrompt();

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customMode, setCustomMode] = useState<"scoreable" | "keepsake">("scoreable");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const prompts = useMemo(() => [...(list.data?.prompts ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [list.data]);
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
    const oldIndex = prompts.findIndex((p) => p.id === active.id);
    const newIndex = prompts.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(prompts, oldIndex, newIndex);
    reorder.mutate(
      { vaultId, data: { orderedVaultQuestionIds: next.map((p) => p.id) } },
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
          <SortableContext items={prompts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {prompts.map((p) => (
                <SortablePromptRow key={p.id} prompt={p} onToggle={handleToggle} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </SectionCard>
  );
}
