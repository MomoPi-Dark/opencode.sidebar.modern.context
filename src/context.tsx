import type { SessionMessageAssistant } from "@opencode/client";
import { Plugin } from "@opencode/plugin/tui";
import { createMemo } from "solid-js";
import { renderProgressBar, usd } from "./utils";

export default Plugin.define({
  id: "opencode.sidebar.modern.context",
  setup(context) {
    context.ui.slot({
      prepend: "sidebar.content",
      render: (input) => {
        const theme = () => context.theme;
        const colors = () => ({
          textMuted: theme().text.muted,
          border: theme().border.base,
          success: theme().text.feedback.success.base,
          warning: theme().text.feedback.warning.base,
          error: theme().text.feedback.error.base,
        });

        const cost = createMemo(() =>
          input?.sessionID ? context.data.session.cost(input.sessionID) : 0,
        );

        const messages = createMemo(() =>
          input?.sessionID
            ? context.data.session.message.list(input.sessionID)
            : [],
        );

        const models = createMemo(
          () => context.data.location.model.list() ?? [],
        );

        const metrics = createMemo(() => {
          const list = messages();

          let toolCalls = 0;
          let cacheRead = 0;
          let cacheWrite = 0;

          for (const m of list) {
            if (m.type === "assistant") {
              if (Array.isArray(m.content)) {
                for (const part of m.content) {
                  if (part.type === "tool") toolCalls++;
                }
              }
              if (m.tokens?.cache) {
                cacheRead += m.tokens.cache.read ?? 0;
                cacheWrite += m.tokens.cache.write ?? 0;
              }
            }
          }

          const lastAssistant = list.findLast(
            (m): m is SessionMessageAssistant =>
              m.type === "assistant" && (m.tokens?.output ?? 0) > 0,
          );

          if (!lastAssistant || !lastAssistant.tokens) {
            return {
              totalTokens: 0,
              percent: 0,
              limitContext: 128_000,
              cacheRead,
              cacheWrite,
              toolCalls,
            };
          }

          const t = lastAssistant.tokens;
          const total =
            (t.input ?? 0) +
            (t.output ?? 0) +
            (t.reasoning ?? 0) +
            (t.cache?.read ?? 0) +
            (t.cache?.write ?? 0);

          const modelID =
            lastAssistant.model?.id ||
            (
              lastAssistant.model as unknown as
                | Record<string, string>
                | undefined
            )?.modelID;
          const providerID = lastAssistant.model?.providerID;

          const modelMatch = models().find(
            (m) =>
              (m.modelID === modelID || m.id === modelID) &&
              m.providerID === providerID,
          );

          const limit = modelMatch?.limit?.context ?? 128_000;
          const percent =
            limit > 0 ? Math.min(100, Math.round((total / limit) * 100)) : 0;

          return {
            totalTokens: total,
            percent,
            limitContext: limit,
            cacheRead,
            cacheWrite,
            toolCalls,
          };
        });

        const statusColor = createMemo(() => {
          const p = metrics().percent;
          if (p >= 80) return colors().error;
          if (p >= 60) return colors().warning;
          return colors().success;
        });

        const bar = createMemo(() => renderProgressBar(metrics().percent, 18));

        return (
          <box
            flexDirection="column"
            border={true}
            borderStyle="single"
            borderColor={colors().border}
            title=" Context "
            titleAlignment="left"
            titleColor={colors().textMuted}
          >
            <text>
              <span style={{ fg: colors().textMuted }}>
                {"Context".padEnd(9)}
              </span>
              <span style={{ fg: statusColor() }}>
                {`${metrics().percent}%`.padEnd(5)}
              </span>
              <span style={{ fg: colors().border }}>[</span>
              <span style={{ fg: statusColor() }}>{bar().filled}</span>
              <span style={{ fg: colors().border }}>{bar().unfilled}</span>
              <span style={{ fg: colors().border }}>]</span>
            </text>

            <text>
              <span style={{ fg: colors().textMuted }}>
                {"Tokens".padEnd(9)}
              </span>
              <span style={{ fg: colors().success }}>
                {metrics().totalTokens.toLocaleString()}
              </span>
              <span style={{ fg: colors().textMuted }}>{" / "}</span>
              <span style={{ fg: colors().success }}>
                {metrics().limitContext.toLocaleString()}
              </span>
            </text>

            <text>
              <span style={{ fg: colors().textMuted }}>
                {"Cache".padEnd(9)}
              </span>
              <span style={{ fg: colors().success }}>
                {metrics().cacheRead.toLocaleString()}
              </span>
              <span style={{ fg: colors().textMuted }}>{" read / "}</span>
              <span style={{ fg: colors().success }}>
                {metrics().cacheWrite.toLocaleString()}
              </span>
              <span style={{ fg: colors().textMuted }}>{" wr"}</span>
            </text>

            <text>
              <span style={{ fg: colors().textMuted }}>{"Cost".padEnd(9)}</span>
              <span style={{ fg: colors().success }}>{usd.format(cost())}</span>
            </text>

            <text>
              <span style={{ fg: colors().textMuted }}>
                {"Tools".padEnd(9)}
              </span>
              <span style={{ fg: colors().success }}>
                {metrics().toolCalls}
              </span>
              <span style={{ fg: colors().textMuted }}>
                {metrics().toolCalls === 1 ? " call" : " calls"}
              </span>
            </text>
          </box>
        );
      },
    });
  },
});
