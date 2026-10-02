# OpenCode Context Plugin (`opencode.sidebar.modern.context`)

> **Note**: This plugin is specifically designed for **OpenCode v2** (`>= 2.0.0`) using the modern TUI slot architecture (`context.ui.slot`) and SolidJS (`@opentui/solid`).

A lightweight, real-time context window and session metric visualizer for the [OpenCode](https://opencode.ai) v2 TUI sidebar.

```text
┌ Context ────────────────────────┐
│ Context  80%  [██████████████░░] │
│ Tokens   159,157 / 200,000       │
│ Cache    14,250 read / 1,200 wr  │
│ Cost     $0.0245                 │
│ Tools    96 calls                │
└──────────────────────────────────┘
```

---

## Compatibility

- **OpenCode**: `v2.0.0` or higher (OpenCode v1 is not supported due to TUI slot API differences).
- **Runtime**: Bun (`>= 1.0.0`)

---

## Features

- **Context Usage Progress Bar**: Visual block progress bar (`█` and `░`) with dynamic semantic threshold coloring:
  - `< 60%`: Green / Success
  - `60% - 79%`: Yellow / Warning
  - `>= 80%`: Red / Error
- **Token Tracking**: Compares current total session tokens against the active model's context window limit.
- **Cache Read & Write Metrics**: Displays cached token read hits and write creations (`read / wr`).
- **Session Cost Calculation**: Real-time USD accumulated session cost.
- **Tool Call Counter**: Tracks tool calls executed in the active session.
- **Theme-Aware**: Adapts automatically to the active OpenCode v2 theme.

---

## Installation

### Method 1: Local Plugin Directory (Recommended)

Clone the repository into your OpenCode plugins folder:

```bash
git clone https://github.com/MomoPi-Dark/opencode.sidebar.modern.context.git ~/.config/opencode/plugins/opencode.sidebar.modern.context
```

Install dependencies:

```bash
cd ~/.config/opencode/plugins/opencode.sidebar.modern.context
bun install
```

### Method 2: Configure in `opencode.jsonc`

Add the plugin to your `plugin` array in `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": [
    "opencode.sidebar.modern.context"
  ]
}
```

---

## Development & Testing

Run unit tests:

```bash
bun test.ts
```

Validate build:

```bash
bun run build
```

---

## License

[MIT](./LICENSE) © 2026 Gamflaz
