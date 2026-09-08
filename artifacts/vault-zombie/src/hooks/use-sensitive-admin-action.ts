import { useReverification } from "@clerk/react";

type ReverificationHint = {
  clerk_error: {
    type: "forbidden";
    reason: "reverification-error";
    metadata?: unknown;
  };
};

function hintFromError(error: unknown): ReverificationHint | null {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== "object" || !("clerk_error" in data)) return null;
  const clerkError = (data as ReverificationHint).clerk_error;
  return clerkError?.reason === "reverification-error" ? data as ReverificationHint : null;
}

/**
 * Adapts the workspace client's typed ApiError to Clerk's documented
 * useReverification result shape. Clerk owns the authenticator modal and
 * retries the exact callback after successful session verification.
 */
export function useSensitiveAdminAction() {
  const reverified = useReverification(async <T>(action: () => Promise<T>) => {
    try {
      return await action();
    } catch (error) {
      const hint = hintFromError(error);
      if (hint) return hint;
      throw error;
    }
  });

  return async <T>(action: () => Promise<T>): Promise<T> => {
    return await reverified(action) as T;
  };
}
