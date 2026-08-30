import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Button, Card, Loading, ReadError } from "@/components/ui";
import { DetailPage, Field, Prose, Section } from "@/components/Detail";
import { describeSchedule } from "@/core/schedule";
import { useRoutine } from "@/hooks/useLibrary";
import { relativeTime } from "@/lib/time";

export default function RoutineDetail() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useRoutine(name);

  if (isLoading) return <Loading />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;
  if (!data) return <Loading />;

  const environment =
    data.environment.type === "Named"
      ? data.environment.value.name
      : data.environment.type === "Runtime"
        ? data.environment.value.vendor
        : "no runtime";

  return (
    <>
      <Stack.Screen options={{ title: data.name }} />
      <DetailPage>
        <Section title="Schedule">
          <Card>
            <Field label="Fires" value={describeSchedule(data.schedule)} />
            <Field label="Enabled" value={data.enabled ? "yes" : "no"} />
            <Field
              label="Next run"
              value={data.nextRunAtMs ? relativeTime(data.nextRunAtMs) : undefined}
            />
            <Field
              label="Last run"
              value={data.lastRunAtMs ? relativeTime(data.lastRunAtMs) : undefined}
            />
            <Field label="Last error" value={data.lastError} />
          </Card>
        </Section>

        <Section title="Runs">
          <Card>
            <Field label="Agent" value={data.agent} mono />
            <Field label="Environment" value={environment} mono />
            <Field label="About" value={data.description} />
          </Card>
        </Section>

        <Prose label="Prompt" text={data.prompt} />

        {/* A routine's runs are excluded from the session list unless asked
            for by name, so this is the only way to reach the last one. */}
        {data.lastSessionId ? (
          <Button
            label="Open the last run"
            variant="secondary"
            onPress={() => router.push(`/session/${data.lastSessionId}`)}
          />
        ) : null}
      </DetailPage>
    </>
  );
}
