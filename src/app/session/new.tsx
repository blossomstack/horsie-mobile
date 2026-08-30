import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { api } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import { Body, Button, Card, Loading, ReadError, Row } from "@/components/ui";
import { useAgents, useEnvironments } from "@/hooks/useLibrary";
import { radii, space, text, useColors } from "@/theme";

/**
 * Start a session.
 *
 * `CreateSessionRequest` requires an agent, an environment and a non-empty
 * first message — there is no create-then-message shape, because a session
 * with no message is a provisioned runtime nobody asked a question and nothing
 * reclaims one. So all three are on this screen and none is optional.
 */
export default function NewSessionScreen() {
  const router = useRouter();
  const c = useColors();

  const agents = useAgents();
  const environments = useEnvironments();

  const [agent, setAgent] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preset = useMemo(
    () => agents.data?.find((a) => a.name === agent) ?? null,
    [agents.data, agent],
  );

  const ready = preset !== null && environment !== null && message.trim().length > 0;

  const create = async () => {
    if (!ready || !preset || !environment) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.sessions.create({
        agent: { model: preset.model },
        environment: { type: "Named", value: { name: environment } },
        message: message.trim(),
        artifacts: [],
      });
      router.replace(`/session/${created.session.id}`);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Could not start that session");
    } finally {
      setBusy(false);
    }
  };

  if (agents.isLoading || environments.isLoading) return <Loading />;
  if (agents.isError) {
    return <ReadError error={agents.error} onRetry={() => void agents.refetch()} />;
  }
  if (environments.isError) {
    return (
      <ReadError error={environments.error} onRetry={() => void environments.refetch()} />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "New session" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
          <Picker
            title="AGENT"
            items={(agents.data ?? []).map((a) => ({ key: a.name, label: a.name, detail: a.model }))}
            selected={agent}
            onSelect={setAgent}
            empty="No agent presets on this server."
          />

          <Picker
            title="ENVIRONMENT"
            items={(environments.data ?? []).map((e) => ({
              key: e.name,
              label: e.name,
              detail: e.description,
            }))}
            selected={environment}
            onSelect={setEnvironment}
            empty="No environments on this server."
          />

          <View style={{ gap: space.sm }}>
            <Body tone="faint" size="xs" weight="700">
              FIRST MESSAGE
            </Body>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="What should it do?"
              placeholderTextColor={c.legendFaint}
              multiline
              style={{
                minHeight: 110,
                backgroundColor: c.panel,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: c.edge,
                padding: space.md,
                color: c.legend,
                fontSize: text.base,
              }}
            />
          </View>

          {error ? <Body tone="danger">{error}</Body> : null}

          <Button label="Start" onPress={create} busy={busy} disabled={!ready} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Picker({
  title,
  items,
  selected,
  onSelect,
  empty,
}: {
  title: string;
  items: { key: string; label: string; detail?: string }[];
  selected: string | null;
  onSelect: (key: string) => void;
  empty: string;
}) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }}>
      <Body tone="faint" size="xs" weight="700">
        {title}
      </Body>
      {items.length === 0 ? (
        <Body tone="dim" size="sm">
          {empty}
        </Body>
      ) : (
        <Card>
          {items.map((item, i) => (
            <Row key={item.key} first={i === 0} onPress={() => onSelect(item.key)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight={item.key === selected ? "700" : "500"}>{item.label}</Body>
                  {item.detail ? (
                    <Body tone="dim" size="sm" numberOfLines={1}>
                      {item.detail}
                    </Body>
                  ) : null}
                </View>
                {item.key === selected ? <Check size={18} color={c.accent} /> : null}
              </View>
            </Row>
          ))}
        </Card>
      )}
    </View>
  );
}
