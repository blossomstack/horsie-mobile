import { useLayoutEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Check, Circle, CircleDot } from "lucide-react-native";
import { api } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import {
  Body,
  Button,
  Card,
  Loading,
  ReadError,
  Row,
  SectionHeader,
  TextAction,
} from "@/components/ui";
import { useAgents, useEnvironments } from "@/hooks/useLibrary";
import { useRuntimes } from "@/hooks/useRuntimes";
import { isIOS, radii, space, type, useColors } from "@/theme";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Where the session runs: a predefined environment, or a runtime named
 * directly. One selection, not two — picking either replaces the other, and a
 * screen holding both would have to decide which one it meant. */
type Where = { kind: "named" | "runtime"; name: string };

/**
 * Start a session.
 *
 * `CreateSessionRequest` requires an agent, an environment and a non-empty
 * first message — there is no create-then-message shape, because a session
 * with no message is a provisioned runtime nobody asked a question and nothing
 * reclaims one. So all three are on this screen and none is optional.
 *
 * "Where" has two kinds of answer and this screen shows both. A predefined
 * environment names a vendor that builds its own workspace; a runtime is named
 * directly and runs where it already is. Only the second kind was missing, and
 * it is the one a phone most often wants — the machine on the desk.
 *
 * Runtimes that provision are left out on purpose: everything that makes one
 * worth choosing is the repos checked out into it, and there is no repo picker
 * here. Offering one would create a session in an empty workspace.
 */
export default function NewSessionScreen() {
  const navigation = useNavigation<Nav>();
  const c = useColors();

  const agents = useAgents();
  const environments = useEnvironments();
  const runtimes = useRuntimes();

  const [agent, setAgent] = useState<string | null>(null);
  const [where, setWhere] = useState<Where | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preset = useMemo(
    () => agents.data?.find((a) => a.name === agent) ?? null,
    [agents.data, agent],
  );

  // Only the runtimes that run where they already are. See the note above.
  const directRuntimes = useMemo(
    () => runtimes.rows.filter((r) => r.connected && !r.provisions),
    [runtimes.rows],
  );

  const ready = preset !== null && where !== null && message.trim().length > 0;

  const create = async () => {
    if (!ready || !preset || !where) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.sessions.create({
        agent: { model: preset.model },
        environment:
          where.kind === "named"
            ? { type: "Named", value: { name: where.name } }
            : // No repos: a runtime that cannot provision refuses them, and
              // this screen has nothing to check out anyway.
              { type: "Runtime", value: { vendor: where.name, repos: [] } },
        message: message.trim(),
        artifacts: [],
      });
      navigation.navigate("Session", { id: created.session.id });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Could not start that session");
    } finally {
      setBusy(false);
    }
  };

  // iOS puts both verbs in the nav bar; Android pins Start in a footer and
  // leaves cancelling to the back arrow, which is what it means there.
  useLayoutEffect(() => {
    if (!isIOS) return;
    navigation.setOptions({
      headerLeft: () => (
        <TextAction label="Cancel" onPress={() => navigation.goBack()} />
      ),
      headerRight: () => (
        <TextAction
          label="Start"
          role="headline"
          disabled={!ready || busy}
          onPress={() => void create()}
        />
      ),
    });
    // `create` closes over the draft, so it is rebuilt on every keystroke;
    // depending on it would reset the header just as often for no change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, ready, busy]);

  if (agents.isLoading || environments.isLoading || runtimes.isLoading) {
    return <Loading />;
  }
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={{ paddingVertical: space.lg, gap: space.lg }}
        >
          <Picker
            title="AGENT"
            items={(agents.data ?? []).map((a) => ({ key: a.name, label: a.name, detail: a.model }))}
            selected={agent}
            onSelect={setAgent}
            empty="No agent presets on this server."
          />

          <Picker
            title="RUNTIME"
            items={directRuntimes.map((r) => ({
              key: r.name,
              label: r.name,
              detail: r.isDefault ? "Default runtime" : undefined,
            }))}
            selected={where?.kind === "runtime" ? where.name : null}
            onSelect={(name) => setWhere({ kind: "runtime", name })}
            // A failed read is not an empty roster. Saying "nothing is
            // connected" here would send someone to reconnect a runtime that
            // is almost certainly already there.
            empty={
              runtimes.isError
                ? "Could not read the runtimes. Pull to refresh, or pick an environment below."
                : "No runtime is connected. Run `horsie connect` on the machine you want sessions to run on."
            }
          />

          <Picker
            title="ENVIRONMENT"
            items={(environments.data ?? []).map((e) => ({
              key: e.name,
              label: e.name,
              detail: e.description,
            }))}
            selected={where?.kind === "named" ? where.name : null}
            onSelect={(name) => setWhere({ kind: "named", name })}
            empty="No environments on this server."
          />

          <View style={{ gap: space.sm }}>
            <SectionHeader>FIRST MESSAGE</SectionHeader>
            <View style={{ paddingHorizontal: space.lg }}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="What should it do?"
                placeholderTextColor={c.legendFaint}
                multiline
                style={{
                  minHeight: 110,
                  backgroundColor: isIOS ? c.panel : "transparent",
                  borderRadius: radii.block,
                  borderWidth: 1,
                  borderColor: isIOS ? c.edge : c.legendDim,
                  padding: space.lg,
                  color: c.legend,
                  ...type.body,
                }}
              />
            </View>
          </View>

          {error ? (
            <Body
              role="callout"
              tone="danger"
              style={{ paddingHorizontal: space.lg }}
            >
              {error}
            </Body>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Android pins Start in a footer; iOS put it in the nav bar above, so
          there is nothing to pin. */}
      {isIOS ? null : (
        <View
          style={{
            backgroundColor: c.panelRaised,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
          }}
        >
          <Button
            full
            label="Start"
            onPress={create}
            busy={busy}
            disabled={!ready}
          />
        </View>
      )}
    </>
  );
}

/**
 * One of three single-select lists.
 *
 * iOS marks the chosen row with a check at the trailing edge and a heavier
 * name; M3 marks it with a leading radio and fills the whole row. Two idioms
 * for one state, and picking either on the wrong platform reads as a bug.
 */
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
      <SectionHeader>{title}</SectionHeader>
      {items.length === 0 ? (
        <Body
          role="subhead"
          tone="dim"
          style={{ paddingHorizontal: space.lg }}
        >
          {empty}
        </Body>
      ) : (
        <Card style={{ marginHorizontal: space.lg }}>
          {items.map((item, i) => {
            const on = item.key === selected;
            return (
              <Row
                key={item.key}
                first={i === 0}
                onPress={() => onSelect(item.key)}
                style={on && !isIOS ? { backgroundColor: c.accentQuiet } : null}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.md,
                  }}
                >
                  {isIOS ? null : on ? (
                    <CircleDot size={22} color={c.accent} />
                  ) : (
                    <Circle size={22} color={c.legendDim} />
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Body
                      role="body"
                      weight={on && isIOS ? "700" : isIOS ? "500" : "400"}
                    >
                      {item.label}
                    </Body>
                    {item.detail ? (
                      <Body role="subhead" tone="dim" numberOfLines={1}>
                        {item.detail}
                      </Body>
                    ) : null}
                  </View>
                  {isIOS && on ? <Check size={18} color={c.accent} /> : null}
                </View>
              </Row>
            );
          })}
        </Card>
      )}
    </View>
  );
}
