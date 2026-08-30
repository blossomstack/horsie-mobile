import { Stack, useLocalSearchParams } from "expo-router";
import { Card, Loading, ReadError } from "@/components/ui";
import { DetailPage, Field, Section } from "@/components/Detail";
import { useEnvironment } from "@/hooks/useLibrary";

export default function EnvironmentDetail() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { data, isLoading, isError, error, refetch } = useEnvironment(name);

  if (isLoading) return <Loading />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;
  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen options={{ title: data.name }} />
      <DetailPage>
        <Section title="Runs on">
          <Card>
            <Field label="Vendor" value={data.vendor} mono />
            <Field label="About" value={data.description} />
          </Card>
        </Section>

        {data.repos.length > 0 ? (
          <Section title="Repositories">
            <Card>
              {data.repos.map((repo) => (
                <Field
                  key={repo.url}
                  label={repo.dir ?? "checkout"}
                  value={repo.gitRef ? `${repo.url} @ ${repo.gitRef}` : repo.url}
                  mono
                />
              ))}
            </Card>
          </Section>
        ) : null}

        {data.envVars.length > 0 ? (
          <Section title="Environment">
            <Card>
              {data.envVars.map((v) => (
                // The server redacts what it considers a secret; whatever
                // arrives here is shown as it arrived, never re-masked, so the
                // screen cannot imply a value is protected when it is not.
                <Field key={v.name} label={v.name} value={v.value} mono />
              ))}
            </Card>
          </Section>
        ) : null}

        {data.provision.length > 0 ? (
          <Section title="Provisioning">
            <Card>
              {data.provision.map((step, i) => (
                <Field key={`${step.name}-${i}`} label={step.name} value={step.uses} mono />
              ))}
            </Card>
          </Section>
        ) : null}
      </DetailPage>
    </>
  );
}
