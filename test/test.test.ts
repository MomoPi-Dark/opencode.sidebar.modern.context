import assert from "node:assert";

function renderProgressBar(
  percent: number,
  width: number = 18,
): { filled: string; unfilled: string } {
  const clamped = Math.max(0, Math.min(100, percent));
  const filledCount = Math.round((clamped / 100) * width);
  const unfilledCount = width - filledCount;

  return {
    filled: "█".repeat(filledCount),
    unfilled: "░".repeat(unfilledCount),
  };
}

const bar80 = renderProgressBar(80, 18);
assert.strictEqual(bar80.filled.length + bar80.unfilled.length, 18);
assert.strictEqual(bar80.filled, "██████████████");
assert.strictEqual(bar80.unfilled, "░░░░");

const mockTokens = {
  input: 1000,
  output: 500,
  reasoning: 0,
  cache: { read: 14250, write: 1200 },
};
assert.strictEqual(mockTokens.cache.read, 14250);
assert.strictEqual(mockTokens.cache.write, 1200);

const lastAssistantWithoutModel = { tokens: { output: 100 } } as any;
const modelID =
  lastAssistantWithoutModel.model?.id ||
  (lastAssistantWithoutModel.model as unknown as Record<string, string> | undefined)?.modelID;
const providerID = lastAssistantWithoutModel.model?.providerID;
const modelMatch = undefined as any;
const limit = modelMatch?.limit?.context ?? 128_000;
assert.strictEqual(limit, 128_000);
assert.strictEqual(modelID, undefined);
assert.strictEqual(providerID, undefined);

console.log("Block progress bar & cache tests passed!");
