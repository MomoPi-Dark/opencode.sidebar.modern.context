import { ModelRef } from "@opencode/client";

export const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

export function renderProgressBar(
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

export const keyOf = (m?: ModelRef) => {
    const id = m?.id;
    return id && m?.providerID ? `${m.providerID}:${id}` : undefined;
};
