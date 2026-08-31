import { useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Button, Card, Loading, ReadError } from "@/components/ui";
import { DetailPage, Field, Prose, Section } from "@/components/Detail";
import { describeSchedule } from "@/core/schedule";
import { useRoutine } from "@/hooks/useLibrary";
import { relativeTime } from "@/lib/time";

import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function RoutineDetail() {
  const { name } = useRoute<RouteProp<RootStackParamList, "RoutineDetail">>().params;
  const navigation = useNavigation<Nav>();
  const { data, isLoading, isError, error, refetch } = useRoutine(name);

  useEffect(() => {
    navigation.setOptions({ title: data?.name ?? "" });
  }, [navigation, data?.name]);

  if (isLoading) return <Loading />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;
  if (!data) return <Loading />;

  const lastRun = data.lastSessionId;
  const environment =
    data.environment.type === "Named"
      ? data.environment.value.name
      : data.environment.type === "Runtime"
        ? data.environment.value.vendor
        : "no runtime";

  return (
    <>
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
        {lastRun ? (
          <Button
            label="Open the last run"
            variant="secondary"
            onPress={() => navigation.navigate("Session", { id: lastRun })}
          />
        ) : null}
      </DetailPage>
    </>
  );
}
