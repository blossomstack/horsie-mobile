/**
 * Every screen, and what it takes.
 *
 * Hand-written rather than generated from a file tree, which is what
 * expo-router gave us. The trade is worth it: this is checked at the call site
 * the moment you write it, whereas the generated version only existed after
 * the dev server had run and went stale whenever it had not.
 */
export type RootStackParamList = {
  Boot: undefined;
  Connect: undefined;
  Projects: undefined;
  Tabs: undefined;

  /** `agent` absent means the session's main agent. */
  Session: { id: string; agent?: string };
  Graph: { id: string };
  NewSession: undefined;
  Message: { id: string };

  Agents: undefined;
  AgentDetail: { name: string };
  Environments: undefined;
  EnvironmentDetail: { name: string };
  Workflows: undefined;
  WorkflowDetail: { name: string };
  Routines: undefined;
  RoutineDetail: { name: string };

  SettingsProjects: undefined;
  SettingsModels: undefined;
  SettingsRuntimes: undefined;
  SettingsSkills: undefined;
  SettingsMemory: undefined;
  SettingsMcp: undefined;
};

export type TabParamList = {
  Inbox: undefined;
  SessionList: undefined;
  Library: undefined;
  Settings: undefined;
};
