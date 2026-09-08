export type PlanTier = "lockbox" | "safe" | "vault" | "deep_vault";
export type RevealSchedule =
  | "weekly_sprint"
  | "monthly_x3"
  | "monthly_year"
  | "half_then_annual"
  | "annual_keepsake";

export interface RevealSlotDefinition {
  kind: "scheduled" | "milestone";
  label: string;
  revealDate: string;
}

export const PLAN_POLICY: Record<
  PlanTier,
  { durationYears: number; guestCap: number; schedules: RevealSchedule[] }
> = {
  lockbox: { durationYears: 0.25, guestCap: 10, schedules: ["weekly_sprint", "monthly_x3"] },
  safe: { durationYears: 3, guestCap: 50, schedules: [
    "weekly_sprint",
    "monthly_x3",
    "monthly_year",
    "half_then_annual",
  ] },
  vault: { durationYears: 5, guestCap: 100, schedules: [
    "weekly_sprint",
    "monthly_x3",
    "monthly_year",
    "half_then_annual",
    "annual_keepsake",
  ] },
  deep_vault: { durationYears: 10, guestCap: 250, schedules: [
    "weekly_sprint",
    "monthly_x3",
    "monthly_year",
    "half_then_annual",
    "annual_keepsake",
  ] },
};

function parseDate(value: string): Date {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return date;
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonthsClamped(value: Date, months: number): Date {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0, 12),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(value.getUTCDate(), lastDay),
      12,
    ),
  );
}

function scheduledSlots(
  anchor: Date,
  plan: PlanTier,
  schedule: RevealSchedule,
): RevealSlotDefinition[] {
  const maxYears = PLAN_POLICY[plan].durationYears;
  switch (schedule) {
    case "weekly_sprint":
      return Array.from({ length: 8 }, (_, index) => ({
        kind: "scheduled",
        label: `Week ${index + 1}`,
        revealDate: formatDate(addDays(anchor, (index + 1) * 7)),
      }));
    case "monthly_x3":
      return Array.from({ length: 3 }, (_, index) => ({
        kind: "scheduled",
        label: `Month ${index + 1}`,
        revealDate: formatDate(addMonthsClamped(anchor, index + 1)),
      }));
    case "monthly_year":
      return Array.from({ length: 13 }, (_, index) => ({
        kind: "scheduled",
        label: `Month ${index + 1}`,
        revealDate: formatDate(addMonthsClamped(anchor, index + 1)),
      }));
    case "half_then_annual": {
      const slots: RevealSlotDefinition[] = [
        {
          kind: "scheduled",
          label: "6 months",
          revealDate: formatDate(addMonthsClamped(anchor, 6)),
        },
      ];
      for (let year = 1; year <= Math.floor(maxYears); year += 1) {
        slots.push({
          kind: "scheduled",
          label: `Year ${year}`,
          revealDate: formatDate(addMonthsClamped(anchor, year * 12)),
        });
      }
      return slots;
    }
    case "annual_keepsake":
      return Array.from({ length: Math.floor(maxYears) }, (_, index) => ({
        kind: "scheduled",
        label: `Year ${index + 1}`,
        revealDate: formatDate(addMonthsClamped(anchor, (index + 1) * 12)),
      }));
  }
}

export function buildRevealSlots(input: {
  anchorDate: string;
  sealDate: string;
  planTier: PlanTier;
  schedule: RevealSchedule;
  milestoneDate?: string | null;
  milestoneLabel?: string | null;
}): RevealSlotDefinition[] {
  const anchor = parseDate(input.anchorDate);
  const seal = parseDate(input.sealDate);
  if (!PLAN_POLICY[input.planTier].schedules.includes(input.schedule)) {
    throw new Error(
      `${input.schedule} is not available on the ${input.planTier} plan.`,
    );
  }
  const slots = scheduledSlots(anchor, input.planTier, input.schedule);

  if (!input.milestoneDate) return slots;
  if (input.planTier !== "deep_vault") {
    throw new Error("A milestone is available only on Deep Vault.");
  }

  const milestone = parseDate(input.milestoneDate);
  if (milestone <= anchor || milestone <= seal) {
    throw new Error("The milestone must be after the event and seal dates.");
  }

  const date = formatDate(milestone);
  const existing = slots.find((slot) => slot.revealDate === date);
  if (existing) {
    existing.kind = "milestone";
    existing.label = input.milestoneLabel?.trim() || "Milestone";
    return slots;
  }

  return [
    ...slots,
    {
      kind: "milestone" as const,
      label: input.milestoneLabel?.trim() || "Milestone",
      revealDate: date,
    },
  ];
}

export function isGuestOverSoftCap(plan: PlanTier, completedGuestCount: number) {
  return completedGuestCount > PLAN_POLICY[plan].guestCap;
}
