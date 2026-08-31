import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, View } from "react-native";
import { api } from "@/api/client";
import { Body, Card, Empty, Loading, Pill, ReadError, Row } from "@/components/ui";
import { Section } from "@/components/Detail";
import { NamedRow } from "@/components/ReadOnlyList";
import { useConnection } from "@/state/connection";
import { space } from "@/theme";

/**
 * Where an agent's skills come from: installed bundles, the marketplaces they
 * were installed from, and the ones agents wrote themselves.
 *
 * Three reads on one screen because they are three answers to one question,
 * and split across three screens you could not tell which source a skill came
 * from without visiting all of them.
 */
export default function SkillsScreen() {
  const { project } = useConnection();
  const enabled = project !== null;

  const bundles = useQuery({
    queryKey: ["plugins", project],
    queryFn: () => api.skills.bundles(),
    enabled,
  });
  const marketplaces = useQuery({
    queryKey: ["marketplaces", project],
    queryFn: () => api.skills.marketplaces(),
    enabled,
  });
  const authored = useQuery({
    queryKey: ["authored-plugins", project],
    queryFn: () => api.skills.authored(),
    enabled,
  });

  if (bundles.isLoading) return <Loading />;
  if (bundles.isError) {
    return <ReadError error={bundles.error} onRetry={() => void bundles.refetch()} />;
  }

  const nothing =
    (bundles.data?.length ?? 0) === 0 &&
    (marketplaces.data?.length ?? 0) === 0 &&
    (authored.data?.length ?? 0) === 0;

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg }}
        refreshControl={
          <RefreshControl
            refreshing={bundles.isRefetching}
            onRefresh={() => {
              void bundles.refetch();
              void marketplaces.refetch();
              void authored.refetch();
            }}
          />
        }
      >
        {nothing ? (
          <Empty
            title="No skills"
            detail="Install a bundle in the web UI, or let an agent write one."
          />
        ) : null}

        {bundles.data?.length ? (
          <Section title="Installed bundles">
            <Card>
              {bundles.data.map((p, i) => (
                <Row key={p.name} first={i === 0}>
                  <NamedRow
                    name={p.name}
                    detail={p.description}
                    trailing={
                      <Pill
                        label={p.enabledDefault ? "On by default" : "Opt in"}
                        tone={p.enabledDefault ? "ok" : "quiet"}
                      />
                    }
                  />
                </Row>
              ))}
            </Card>
          </Section>
        ) : null}

        {authored.data?.length ? (
          <Section title="Written by agents">
            <Card>
              {authored.data.map((a, i) => (
                <Row key={a.name} first={i === 0}>
                  <View style={{ gap: space.xs }}>
                    <NamedRow
                      name={a.name}
                      detail={a.description}
                      // A generation names the row's revision, not the bytes —
                      // it moves whenever an agent rewrites the bundle.
                      trailing={<Pill label={`gen ${a.generation}`} />}
                    />
                    {a.skills.length > 0 ? (
                      <Body tone="faint" size="sm">
                        {a.skills.map((s) => s.name).join(", ")}
                      </Body>
                    ) : null}
                  </View>
                </Row>
              ))}
            </Card>
          </Section>
        ) : null}

        {marketplaces.data?.length ? (
          <Section title="Marketplaces">
            <Card>
              {marketplaces.data.map((m, i) => (
                <Row key={m.name} first={i === 0}>
                  <View style={{ gap: space.xs }}>
                    <NamedRow
                      name={m.name}
                      detail={m.sourceRef ? `${m.sourceUrl} @ ${m.sourceRef}` : m.sourceUrl}
                      trailing={<Pill label={`${m.pluginCount}`} />}
                    />
                    {/* A skipped entry is one the marketplace offered and the
                        server would not take — silence here would make a
                        missing skill look like it was never published. */}
                    {m.skipped.length > 0 ? (
                      <Body tone="danger" size="sm">
                        skipped: {m.skipped.join(", ")}
                      </Body>
                    ) : null}
                  </View>
                </Row>
              ))}
            </Card>
          </Section>
        ) : null}

        <Body tone="faint" size="sm">
          Read-only. Bundles are installed and enabled in the web UI.
        </Body>
      </ScrollView>
    </>
  );
}
