import type { ModelRef, SessionMessageAssistant } from "@opencode/client";
import { Plugin } from "@opencode/plugin/tui";
import { createMemo, createSignal, Show, type JSX } from "solid-js";
import { keyOf, renderProgressBar, usd } from "./utils";

const LABEL_WIDTH = 8;
const PERCENT_WIDTH = 5;
const CHROME = 2 + 2;
const MIN_BAR = 6;
const MAX_BAR = 40;
const FALLBACK_INNER = 30;

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fmt = (n: number) => (n < 1000 ? String(n) : compact.format(n));

type Base = { cacheRead: number; cacheWrite: number; toolCalls: number };
type Metrics =
  | (Base & { empty: true })
  | (Base & {
      empty: false;
      total: number;
      limit?: number;
      percent?: number;
      left?: number;
      hitRate?: number;
    });

export default Plugin.define({
  id: "opencode.context.tui",
  setup: (context) =>
    context.ui.slot({
      prepend: "sidebar.content",
      render: (input) => {
        // `messages` harus dideklarasikan sebelum `currentKey` (hindari TDZ)
        const messages = createMemo(() =>
          input.sessionID
            ? context.data.session.message.list(input.sessionID)
            : [],
        );

        const cost = createMemo(() =>
          input.sessionID ? context.data.session.cost(input.sessionID) : 0,
        );

        // Key harus berformat "providerID:modelID", sama dengan modelLimits
        const currentKey = createMemo(() => {
          const fromSession = input.sessionID
            ? keyOf(context.data.session.get(input.sessionID)?.model)
            : undefined;
          if (fromSession) return fromSession;

          const selected = (
            context.data.location.model as {
              current?: () => ModelRef | undefined;
            }
          ).current?.();
          const fromSelected = keyOf(selected);
          if (fromSelected) return fromSelected;

          const list = messages();
          for (let i = list.length - 1; i >= 0; i--) {
            const k = keyOf((list[i] as { model?: ModelRef }).model);
            if (k) return k;
          }
          return undefined;
        });

        const colors = createMemo(() => {
          const t = context.theme;
          return {
            muted: t.text.muted,
            border: t.border.base,
            success: t.text.feedback.success.base,
            warning: t.text.feedback.warning.base,
            error: t.text.feedback.error.base,
          };
        });

        const modelLimits = createMemo(() => {
          const limits = new Map<string, number>();
          for (const m of context.data.location.model.list() ?? []) {
            limits.set(`${m.providerID}:${m.modelID}`, m.limit.context);
          }
          return limits;
        });

        const metrics = createMemo<Metrics>(() => {
          let toolCalls = 0;
          let cacheRead = 0;
          let cacheWrite = 0;
          let last: SessionMessageAssistant | undefined;

          for (const m of messages()) {
            if (m.type !== "assistant") continue;
            if ((m.tokens?.output ?? 0) > 0) last = m;
            if (Array.isArray(m.content)) {
              for (const part of m.content)
                if (part.type === "tool") toolCalls++;
            }
            cacheRead += m.tokens?.cache?.read ?? 0;
            cacheWrite += m.tokens?.cache?.write ?? 0;
          }

          const base: Base = { cacheRead, cacheWrite, toolCalls };
          if (!last?.tokens) return { ...base, empty: true };

          const t = last.tokens;
          const inputTokens = t.input ?? 0;
          const read = t.cache?.read ?? 0;
          const write = t.cache?.write ?? 0;
          const total =
            inputTokens + (t.output ?? 0) + (t.reasoning ?? 0) + read + write;

          const key = currentKey();
          const limit = key ? modelLimits().get(key) : undefined;
          const percent = limit
            ? Math.min(100, Math.round((total / limit) * 100))
            : undefined;

          const promptTotal = inputTokens + read + write;
          const hitRate =
            promptTotal > 0
              ? Math.round((read / promptTotal) * 100)
              : undefined;

          return {
            ...base,
            empty: false,
            total,
            limit,
            percent,
            left: limit ? Math.max(0, limit - total) : undefined,
            hitRate,
          };
        });

        // undefined bila belum ada aktivitas assistant
        const ready = createMemo(() => {
          const m = metrics();
          return m.empty ? undefined : m;
        });

        const statusColor = createMemo(() => {
          const p = ready()?.percent ?? 0;
          if (p >= 80) return colors().error;
          if (p >= 60) return colors().warning;
          return colors().success;
        });

        // Lebar box sidebar (diukur reaktif)
        const [boxWidth, setBoxWidth] = createSignal(0);

        const innerWidth = createMemo(() =>
          Math.max(0, (boxWidth() || FALLBACK_INNER + CHROME) - CHROME),
        );
        // sisa ruang untuk nilai di sebelah label
        const room = createMemo(() => Math.max(0, innerWidth() - LABEL_WIDTH));

        // Pilih sufiks terpanjang yang masih muat (urutkan dari terpanjang)
        const pick = (used: number, ...options: string[]) =>
          options.find((o) => used + o.length <= room()) ?? "";

        const barWidth = createMemo(() =>
          Math.min(MAX_BAR, Math.max(MIN_BAR, room() - PERCENT_WIDTH)),
        );

        const bar = createMemo(() =>
          renderProgressBar(ready()?.percent ?? 0, barWidth()),
        );

        const Row = (props: { label: string; children: JSX.Element }) => (
          <text wrapMode="none">
            <span style={{ fg: colors().muted }}>
              {props.label.padEnd(LABEL_WIDTH)}
            </span>
            {props.children}
          </text>
        );

        const Muted = (props: { children: JSX.Element }) => (
          <span style={{ fg: colors().muted }}>{props.children}</span>
        );

        return (
          <box
            ref={(el: { width: number; onSizeChange?: () => void }) => {
              setBoxWidth(el.width);
              el.onSizeChange = () => setBoxWidth(el.width);
            }}
            width="100%"
            overflow="hidden"
            flexDirection="column"
            border={true}
            borderStyle="single"
            borderColor={colors().border}
            title=" Context "
            titleAlignment="left"
            titleColor={colors().muted}
            paddingLeft={1}
            paddingRight={1}
          >
            <Show
              when={ready()}
              fallback={
                <text wrapMode="none">
                  <Muted>Belum ada aktivitas</Muted>
                </text>
              }
            >
              {(m) => {
                const tokensBase = () =>
                  `${fmt(m().total)} / ${m().limit ? fmt(m().limit!) : "?"}`;
                const tokensSuffix = () =>
                  m().left === undefined
                    ? ""
                    : pick(
                        tokensBase().length,
                        ` (${fmt(m().left!)} left)`,
                        ` (${fmt(m().left!)})`,
                      );

                const cacheBase = () =>
                  `${fmt(m().cacheRead)} r / ${fmt(m().cacheWrite)} w`;
                const cacheSuffix = () =>
                  m().hitRate === undefined
                    ? ""
                    : pick(
                        cacheBase().length,
                        ` · ${m().hitRate}% hit`,
                        ` · ${m().hitRate}%`,
                      );

                return (
                  <>
                    <Row label="Usage">
                      <Show
                        when={m().percent !== undefined}
                        fallback={<Muted>limit tidak diketahui</Muted>}
                      >
                        <span style={{ fg: statusColor() }}>
                          {`${m().percent}%`.padEnd(PERCENT_WIDTH)}
                        </span>
                        <span style={{ fg: statusColor() }}>
                          {bar().filled}
                        </span>
                        <span style={{ fg: colors().border }}>
                          {bar().unfilled}
                        </span>
                      </Show>
                    </Row>

                    <Row label="Tokens">
                      <span style={{ fg: statusColor() }}>
                        {fmt(m().total)}
                      </span>
                      <Muted>{` / ${m().limit ? fmt(m().limit!) : "?"}`}</Muted>
                      <Muted>{tokensSuffix()}</Muted>
                    </Row>

                    <Row label="Cache">
                      <span style={{ fg: colors().success }}>
                        {fmt(m().cacheRead)}
                      </span>
                      <Muted>{" r / "}</Muted>
                      <span style={{ fg: colors().success }}>
                        {fmt(m().cacheWrite)}
                      </span>
                      <Muted>{" w"}</Muted>
                      <Muted>{cacheSuffix()}</Muted>
                    </Row>
                  </>
                );
              }}
            </Show>

            <Row label="Cost">
              <span style={{ fg: colors().success }}>{usd.format(cost())}</span>
            </Row>

            <Row label="Tools">
              <span style={{ fg: colors().success }}>
                {metrics().toolCalls}
              </span>
              <Muted>{metrics().toolCalls === 1 ? " call" : " calls"}</Muted>
            </Row>
          </box>
        );
      },
    }),
});
