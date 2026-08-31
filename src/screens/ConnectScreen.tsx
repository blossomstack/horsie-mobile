import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import { ApiRequestError } from "@/api/errors";
import * as probe from "@/api/probe";
import { newServerId, normalizeBaseUrl, type ServerRecord } from "@/api/tokens";
import { Body, Button, Card, Mono, Title, monoFamily } from "@/components/ui";
import { useConnection } from "@/state/connection";
import { radii, space, text, useColors } from "@/theme";
import type { DeviceCodeResponse } from "@/api/types";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Stage =
  | { kind: "url" }
  | { kind: "approving"; code: DeviceCodeResponse; baseUrl: string };

/** How long to keep polling before giving up, if the server names no expiry. */
const FALLBACK_EXPIRY_SECS = 600;

export default function Connect() {
  const navigation = useNavigation<Nav>();
  const { connect } = useConnection();
  const c = useColors();

  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "url" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which attempt is live. Bumped by unmount, by "Start over", and by each
  // new attempt; a poll loop stops as soon as its own number is stale.
  const generation = useRef(0);

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  /**
   * Poll until the code is approved.
   *
   * `authorization_pending` is the normal answer and is not an error; only
   * `expired_token` and `access_denied` end the flow. `slow_down` means the
   * server wants a longer gap, and it says so once per breach — so the
   * interval is widened permanently rather than for a single sleep.
   */
  const poll = useCallback(
    async (baseUrl: string, code: DeviceCodeResponse, record: ServerRecord) => {
      const mine = generation.current;
      const live = () => generation.current === mine;
      let interval = Math.max(code.interval, 1) * 1000;
      const deadline = Date.now() + (code.expiresIn || FALLBACK_EXPIRY_SECS) * 1000;

      while (live() && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, interval));
        if (!live()) return;
        try {
          const tokens = await probe.deviceToken(baseUrl, code.deviceCode);
          await connect(record, tokens);
          navigation.navigate("Projects");
          return;
        } catch (e) {
          if (!(e instanceof ApiRequestError)) throw e;
          if (e.code === "authorization_pending") continue;
          if (e.code === "slow_down") {
            interval += 1000;
            continue;
          }
          setStage({ kind: "url" });
          setError(e.message);
          return;
        }
      }
      if (live()) {
        setStage({ kind: "url" });
        setError("That code expired before it was approved.");
      }
    },
    [connect, navigation],
  );

  const begin = useCallback(async () => {
    setError(null);
    setBusy(true);
    generation.current += 1;
    try {
      const baseUrl = normalizeBaseUrl(url);

      // Ask before authenticating. A typo'd host otherwise surfaces as a
      // failed device-code call, which reads as "sign-in is broken" rather
      // than "nothing is listening there".
      await probe.health(baseUrl);
      const status = await probe.authStatus(baseUrl);

      const record: ServerRecord = {
        id: newServerId(),
        baseUrl,
        label: new URL(baseUrl).host,
      };

      // A deployment with authentication turned off serves no credential
      // routes at all, so there is nothing to sign in to.
      if (!status.enabled) {
        await connect(record, { accessToken: "", refreshToken: "", expiresIn: 0 });
        navigation.navigate("Projects");
        return;
      }

      const code = await probe.deviceCode(baseUrl);
      setStage({ kind: "approving", code, baseUrl });
      void Linking.openURL(code.verificationUriComplete);
      void poll(baseUrl, code, record);
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? `That does not look like a URL: ${e.message}`
            : "Could not reach that server",
      );
    } finally {
      setBusy(false);
    }
  }, [url, connect, navigation, poll]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        {stage.kind === "url" ? (
          <>
            <Title>Point at a server</Title>
            <Body tone="dim">
              The address of a horsie server you can reach from this device — the same
              one you would open in a browser.
            </Body>

            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://horsie.example"
              placeholderTextColor={c.legendFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              inputMode="url"
              returnKeyType="go"
              onSubmitEditing={begin}
              style={{
                backgroundColor: c.panel,
                borderWidth: 1,
                borderColor: c.edge,
                borderRadius: radii.md,
                padding: space.md,
                color: c.legend,
                fontSize: text.base,
                fontFamily: monoFamily,
              }}
            />

            {error ? <Body tone="danger">{error}</Body> : null}

            <Button
              label="Continue"
              onPress={begin}
              busy={busy}
              disabled={url.trim().length === 0}
            />
          </>
        ) : (
          <>
            <Title>Approve this device</Title>
            <Body tone="dim">
              A browser has opened on {stage.baseUrl}. Sign in there if you are not
              already, then check that it shows this code:
            </Body>

            <Card style={{ padding: space.xl, alignItems: "center" }}>
              <View style={{ gap: space.sm, alignItems: "center" }}>
                <Body
                  size="xxl"
                  weight="700"
                  style={{ fontFamily: monoFamily, letterSpacing: 4 }}
                >
                  {stage.code.userCode}
                </Body>
                <Mono size="xs">waiting for approval…</Mono>
              </View>
            </Card>

            <Button
              label="Open the browser again"
              variant="secondary"
              onPress={() =>
                void Linking.openURL(stage.code.verificationUriComplete)
              }
            />
            <Button
              label="Start over"
              variant="secondary"
              onPress={() => {
                generation.current += 1;
                setStage({ kind: "url" });
              }}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
