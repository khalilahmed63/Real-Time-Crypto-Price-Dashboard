"use client";

import { memo } from "react";
import type { CryptoToken } from "@/lib/tokens";

const TOKENS: CryptoToken[] = ["BTC", "ETH", "USDC"];

type TokenSelectorProps = {
  value: CryptoToken;
  onChange: (t: CryptoToken) => void;
  disabled?: boolean;
};

function TokenSelectorInner({
  value,
  onChange,
  disabled,
}: TokenSelectorProps) {
  return (
    <div
      className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 shadow-inner backdrop-blur-md"
      role="tablist"
      aria-label="Select asset"
    >
      {TOKENS.map((t) => {
        const active = t === value;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(t)}
            className={[
              "relative min-w-[4.5rem] rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200",
              disabled ? "opacity-50" : "",
            ].join(" ")}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

export const TokenSelector = memo(TokenSelectorInner);
