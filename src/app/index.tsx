import { Redirect } from "expo-router";
import { useConnection } from "@/state/connection";
import { Loading } from "@/components/ui";

/**
 * Where a cold start lands.
 *
 * Three gates in order — a server, a credential, a project — because every
 * data route is scoped by all three and a screen that renders without one of
 * them shows an empty account rather than an error.
 */
export default function Boot() {
  const { ready, server, signedIn, project } = useConnection();

  if (!ready) return <Loading />;
  if (!server || !signedIn) return <Redirect href="/connect" />;
  if (!project) return <Redirect href="/projects" />;
  return <Redirect href="/(tabs)/inbox" />;
}
