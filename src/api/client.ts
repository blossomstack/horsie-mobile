import { scopedUrl, send, unscopedUrl } from "./connection";
import type {
  AgentView,
  AuthStatus,
  AuthoredPluginView,
  CreateSessionRequest,
  CreateSessionResponse,
  DeviceCodeResponse,
  DeviceTokenRequest,
  EnvironmentView,
  GetAgentResponse,
  GetSessionResponse,
  InboxListResponse,
  InboxMessageIds,
  InboxReplyRequest,
  ListSessionsResponse,
  MarketplaceView,
  MemorySpaceView,
  MemoryView,
  MessagesPage,
  ModelView,
  PluginView,
  ProjectView,
  ProviderView,
  RoutineView,
  RuntimeVendorConfigView,
  SessionAck,
  SettingsView,
  TokenPair,
  WorkflowRunGraph,
  WorkflowView,
  Ack,
} from "./types";

/** A request relative to the current project. */
const scoped = <T,>(path: string, init?: RequestInit): Promise<T> =>
  send<T>(scopedUrl(path), init);

/**
 * A request that belongs to no project: the credential routes, and `/projects`
 * itself — which is how a client learns what may go in the scoped prefix.
 */
const unscoped = <T,>(path: string, init?: RequestInit): Promise<T> =>
  send<T>(unscopedUrl(path), init);

const post = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});

/** The path segment naming a session's primary agent, as opposed to a
 * subagent's uuid. Mirrors the server's own spelling. */
export const MAIN_AGENT = "main";

/** Which slice of the inbox to read, spelled as the server's `state` parameter
 * spells it. An unknown value is refused there rather than widened to
 * everything, so this is a closed set on purpose. */
export type InboxScope = "all" | "open" | "unread";

/**
 * The endpoints this app uses.
 *
 * Read-mostly by design: the writes are answering a parked agent, saying
 * something to a running one, and starting a session. Everything else the
 * server exposes is deliberately absent rather than present-but-unused —
 * a mutation with no screen behind it is a liability, not a feature.
 */
export const api = {
  /** Liveness, and the one call made before a server is trusted enough to
   * authenticate against. */
  health: (): Promise<{ ok: boolean }> => unscoped("/health"),

  auth: {
    /** Whether this deployment has auth on at all, and who serves it. */
    status: (): Promise<AuthStatus> => unscoped("/auth/status"),

    /** Start a device authorization. Public — this is how a client with no
     * credential gets one. */
    deviceCode: (): Promise<DeviceCodeResponse> =>
      unscoped("/device/auth/code", post({})),

    /** Exchange an approved device code for tokens. Answers `authorization_pending`
     * until someone approves it in a browser. */
    deviceToken: (deviceCode: string): Promise<TokenPair> =>
      unscoped(
        "/device/auth/token",
        post({ deviceCode } satisfies DeviceTokenRequest),
      ),
  },

  projects: {
    list: (): Promise<ProjectView[]> => unscoped("/projects"),
  },

  sessions: {
    /** Every session a person started, newest first. Routine runs are left
     * out unless asked for by name — a routine on a timer would otherwise
     * bury the sessions somebody is actually having. */
    list: (filter?: { workflow?: string; routine?: string }): Promise<ListSessionsResponse> => {
      const q = new URLSearchParams();
      if (filter?.workflow) q.set("workflow", filter.workflow);
      if (filter?.routine) q.set("routine", filter.routine);
      const query = q.toString();
      return scoped(`/sessions${query ? `?${query}` : ""}`);
    },

    get: (id: string): Promise<GetSessionResponse> =>
      scoped(`/sessions/${encodeURIComponent(id)}`),

    /** A window of one agent's log, ending just before `before`.
     *
     * Scroll-back only. Forward reading is the stream — the same endpoint
     * without `before` — so there is no second way to page forwards and no
     * backfill loop to keep in step with a subscription. */
    messages: (
      id: string,
      agentId: string,
      opts: { before?: number; max?: number } = {},
    ): Promise<MessagesPage> => {
      const q = new URLSearchParams({ aid: agentId });
      if (opts.before !== undefined) q.set("before", String(opts.before));
      if (opts.max) q.set("max", String(opts.max));
      return scoped(`/sessions/${encodeURIComponent(id)}/messages?${q}`);
    },

    /** One agent's current values: task list, usage, and — for a subagent —
     * its spawn metadata and terminal result. */
    agent: (id: string, agentId: string): Promise<GetAgentResponse> =>
      scoped(
        `/sessions/${encodeURIComponent(id)}/agents/${encodeURIComponent(agentId)}`,
      ),

    /** A session is created *with* the first thing to say to it; there is no
     * create-then-message shape. */
    create: (body: CreateSessionRequest): Promise<CreateSessionResponse> =>
      scoped("/sessions", post(body)),

    /** Send a message to one of a session's agents. `agentId` is not optional
     * in practice: a sub session is an agent, and leaving it out delivers
     * everything typed on a sub session's page to the main agent instead. */
    send: (id: string, text: string, agentId?: string): Promise<SessionAck> =>
      scoped(
        `/sessions/${encodeURIComponent(id)}/messages` +
          (agentId ? `?aid=${encodeURIComponent(agentId)}` : ""),
        post({ text }),
      ),

    /** Answer every pending ask at once; a partial set is refused by the server.
     *
     * `agentId` names who asked. It is not optional: the questions belong to one
     * agent, and a workflow run has no main agent to fall back to. */
    answerAsks: (
      id: string,
      agentId: string,
      answers: { toolCallId: string; text: string }[],
    ): Promise<Ack> =>
      scoped(
        `/sessions/${encodeURIComponent(id)}/answers?aid=${encodeURIComponent(agentId)}`,
        post({ answers }),
      ),

    /** The run graph behind a session that is a workflow run. */
    workflowRun: (id: string): Promise<WorkflowRunGraph> =>
      scoped(`/sessions/${encodeURIComponent(id)}/workflow`),
  },

  inbox: {
    /** A page of the inbox, newest first, with the counts a badge needs. */
    list: (state: InboxScope = "all"): Promise<InboxListResponse> =>
      scoped(`/inbox?state=${state}`),

    /** Note that these have been opened. */
    markRead: (ids: string[]): Promise<Ack> =>
      scoped("/inbox/read", post({ ids } satisfies InboxMessageIds)),

    /** Answer a parked question, or say something to the agent behind a
     * notice. The message's own kind decides which. */
    reply: (id: string, text: string): Promise<Ack> =>
      scoped(
        `/inbox/${encodeURIComponent(id)}/reply`,
        post({ text } satisfies InboxReplyRequest),
      ),
  },

  // Everything below is read-only on purpose: this app shows what a
  // deployment is configured to do, and the web UI is where it is changed.

  agents: {
    list: (): Promise<AgentView[]> => scoped("/agents"),
    get: (name: string): Promise<AgentView> =>
      scoped(`/agents/${encodeURIComponent(name)}`),
  },

  environments: {
    list: (): Promise<EnvironmentView[]> => scoped("/environments"),
    get: (name: string): Promise<EnvironmentView> =>
      scoped(`/environments/${encodeURIComponent(name)}`),
  },

  routines: {
    list: (): Promise<RoutineView[]> => scoped("/routines"),
    get: (name: string): Promise<RoutineView> =>
      scoped(`/routines/${encodeURIComponent(name)}`),
  },

  workflows: {
    list: (): Promise<WorkflowView[]> => scoped("/workflows"),
    get: (name: string): Promise<WorkflowView> =>
      scoped(`/workflows/${encodeURIComponent(name)}`),
  },

  settings: {
    get: (): Promise<SettingsView> => scoped("/config"),
    models: (): Promise<ModelView[]> => scoped("/config/models"),
    providers: (): Promise<ProviderView[]> => scoped("/config/model-providers"),
    runtimeVendors: (): Promise<RuntimeVendorConfigView[]> =>
      scoped("/runtime-vendors"),
  },

  skills: {
    bundles: (): Promise<PluginView[]> => scoped("/plugins"),
    marketplaces: (): Promise<MarketplaceView[]> => scoped("/marketplaces"),
    authored: (): Promise<AuthoredPluginView[]> => scoped("/authored-plugins"),
  },

  memory: {
    spaces: (): Promise<MemorySpaceView[]> => scoped("/memory-spaces"),
    list: (space?: string): Promise<MemoryView[]> =>
      scoped(`/memories${space ? `?space=${encodeURIComponent(space)}` : ""}`),
  },
};
