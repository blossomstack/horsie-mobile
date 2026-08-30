import { Stack, useLocalSearchParams } from "expo-router";
import { Card, Loading, ReadError } from "@/components/ui";
import { DetailPage, Field, Pills, Prose, Section } from "@/components/Detail";
import { useAgent } from "@/hooks/useLibrary";

export default function AgentDetail() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { data, isLoading, isError, error, refetch } = useAgent(name);

  if (isLoading) return <Loading />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;
  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen options={{ title: data.name }} />
      <DetailPage>
        <Section title="Preset">
          <Card>
            <Field label="Model" value={data.model} mono />
            <Field label="Thinking" value={data.thinkingEffort} />
            <Field label="Auto-compact" value={data.autoCompact === undefined ? undefined : data.autoCompact ? "on" : "off"} />
            <Field label="Tunable" value={data.tunable === undefined ? undefined : data.tunable ? "yes" : "no"} />
            <Field label="Revision" value={data.revision} />
          </Card>
        </Section>

        {data.description ? (
          <Section title="Description">
            <Card>
              <Field label="" value={data.description} />
            </Card>
          </Section>
        ) : null}

        <Section title="Reaches">
          <Card>
            <Pills label="Skills" items={data.plugins} />
            <Pills label="MCP servers" items={data.mcpServers} />
            <Pills label="Memory spaces" items={data.memorySpaces} />
            {/* Absent means the default set, which is not the same as none —
                an empty list here would read as "this agent has no tools". */}
            <Pills label="Tools" items={data.allowedTools ?? ["(the default set)"]} />
          </Card>
        </Section>

        <Prose label="Instructions" text={data.instructions} />
      </DetailPage>
    </>
  );
}
