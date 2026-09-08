import { useState, useEffect, useCallback } from "react";
import type { GuestAnswerInput } from "@workspace/api-client-react";

interface DraftState {
  answers: Record<string, GuestAnswerInput>;
  displayName: string;
  email: string;
  emailOptedOut: boolean;
  stepIndex: number;
}

export function useGuestDraft(token: string) {
  const key = `vault_zombie_draft_${token}`;

  const [draft, setDraft] = useState<DraftState>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return {
      answers: {},
      displayName: "",
      email: "",
      emailOptedOut: false,
      stepIndex: 0,
    };
  });

  const saveDraft = useCallback((newState: Partial<DraftState>) => {
    setDraft((prev) => {
      const next = { ...prev, ...newState };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setDraft({
      answers: {},
      displayName: "",
      email: "",
      emailOptedOut: false,
      stepIndex: 0,
    });
  }, [key]);

  return { draft, saveDraft, clearDraft };
}
