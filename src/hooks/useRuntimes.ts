import { useMemo } from "react";
import { api } from "@/api/client";
import { useScopedQuery } from "@/hooks/useLibrary";
import type { RuntimeVendorConfigView, VendorView } from "@/api/types";

/** The whole settings document. Read for the vendor roster; the models and
 * providers on it have screens of their own that read them directly. */
export const useSettings = () => useScopedQuery(["settings"], () => api.settings.get());

/** One runtime a session can name, as the settings screen shows it. */
export interface RuntimeRow {
  name: string;
  isDefault: boolean;
  /** On the roster: a process has dialled in, or the server runs it itself. */
  connected: boolean;
  /** It builds the workspace it runs in — clones repos, runs provision steps.
   * The local daemon does not: it runs in a directory somebody already owns. */
  provisions: boolean;
  /** Its stored configuration, for the cloud vendors that have one. */
  config?: RuntimeVendorConfigView;
}

/**
 * Every runtime, from the two lists that each hold half of them.
 *
 * `settings.vendors` is the live roster — everything a session can name right
 * now, including the local daemon and any `horsie connect` process. It is the
 * only place `local` ever appears. `/runtime-vendors` is the stored
 * configuration of the cloud ones and nothing else. Neither list contains the
 * other, which is why reading only the second one left this screen reporting
 * "No runtimes" on a server that had one connected.
 *
 * Joined on the name, roster first. A configured vendor with no roster entry
 * still gets a row: it was saved, and a settings screen that hides what it
 * just stored is worse than one that shows it as not connected.
 */
export function useRuntimes(): {
  rows: RuntimeRow[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
} {
  const settings = useSettings();
  const configs = useScopedQuery(["runtime-vendors"], () =>
    api.settings.runtimeVendors(),
  );

  const rows = useMemo(() => {
    const roster: VendorView[] = settings.data?.vendors ?? [];
    const stored = configs.data ?? [];
    const joined: RuntimeRow[] = roster.map((v) => ({
      name: v.name,
      isDefault: v.isDefault,
      connected: true,
      provisions: v.capabilities.supportsProvisioning,
      config: stored.find((c) => c.name === v.name),
    }));
    for (const c of stored) {
      if (joined.some((r) => r.name === c.name)) continue;
      joined.push({
        name: c.name,
        isDefault: settings.data?.defaultRuntimeVendor === c.name,
        connected: false,
        // A vendor the server runs itself always provisions; that is the only
        // kind that has stored configuration in the first place.
        provisions: true,
        config: c,
      });
    }
    return joined;
  }, [settings.data, configs.data]);

  return {
    rows,
    // The roster is the list. A failed read of the stored configuration costs
    // a credential pill, not the screen.
    isLoading: settings.isLoading,
    isError: settings.isError,
    error: settings.error,
    refetch: () => Promise.all([settings.refetch(), configs.refetch()]),
  };
}
