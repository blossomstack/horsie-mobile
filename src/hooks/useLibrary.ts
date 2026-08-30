import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useConnection } from "@/state/connection";

/**
 * A read of something that belongs to the current project.
 *
 * `enabled` on the project rather than an early return: a query that ran with
 * no project would throw out of `scopedUrl`, and React Query would surface
 * that routing bug as an ordinary failed read.
 */
function useScopedQuery<T>(key: unknown[], fn: () => Promise<T>) {
  const { project } = useConnection();
  return useQuery({ queryKey: [...key, project], queryFn: fn, enabled: project !== null });
}

// The read-only halves of a deployment: what it can run, where it runs, what
// runs on a schedule, and how those are wired together. All small, rarely
// changing lists, so they are plain queries with no feed behind them.

export const useAgents = () => useScopedQuery(["agents"], () => api.agents.list());
export const useEnvironments = () =>
  useScopedQuery(["environments"], () => api.environments.list());
export const useWorkflows = () => useScopedQuery(["workflows"], () => api.workflows.list());
export const useRoutines = () => useScopedQuery(["routines"], () => api.routines.list());

export const useAgent = (name: string) =>
  useScopedQuery(["agent", name], () => api.agents.get(name));
export const useEnvironment = (name: string) =>
  useScopedQuery(["environment", name], () => api.environments.get(name));
export const useWorkflow = (name: string) =>
  useScopedQuery(["workflow", name], () => api.workflows.get(name));
export const useRoutine = (name: string) =>
  useScopedQuery(["routine", name], () => api.routines.get(name));

export { useScopedQuery };
