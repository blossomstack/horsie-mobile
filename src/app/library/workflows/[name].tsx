import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Body, Card, Loading, Pill, ReadError, Row } from "@/components/ui";
import { DetailPage, Field, Section } from "@/components/Detail";
import { useWorkflow } from "@/hooks/useLibrary";
import { space } from "@/theme";

export default function WorkflowDetail() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { data, isLoading, isError, error, refetch } = useWorkflow(name);

  if (isLoading) return <Loading />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;
  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen options={{ title: data.name }} />
      <DetailPage>
        <Section title="Definition">
          <Card>
            <Field label="Starts at" value={data.start} mono />
            <Field label="Max steps" value={data.maxSteps} />
            <Field label="About" value={data.description} />
          </Card>
        </Section>

        <Section title={`Steps (${data.steps.length})`}>
          <Card>
            {data.steps.map((step, i) => (
              <Row key={step.name} first={i === 0}>
                <View style={{ gap: space.xs }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                    <Body weight="600">{step.name}</Body>
                    {step.name === data.start ? <Pill label="start" tone="ok" /> : null}
                    {step.interactive ? <Pill label="interactive" /> : null}
                  </View>
                  <Body tone="dim" size="sm">
                    runs {step.agent}
                    {/* A step with no transitions is a terminal one, which is
                        a fact about the graph rather than missing data. */}
                    {step.transitions?.length
                      ? ` · ${step.transitions.length} transition${step.transitions.length === 1 ? "" : "s"}`
                      : " · ends the run"}
                  </Body>
                  <Body tone="faint" size="sm" numberOfLines={3}>
                    {step.prompt}
                  </Body>
                </View>
              </Row>
            ))}
          </Card>
        </Section>
      </DetailPage>
    </>
  );
}
