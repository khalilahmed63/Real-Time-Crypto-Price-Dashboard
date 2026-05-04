"use client";

import { memo } from "react";
import { CRYPTO_TOKEN_ORDER, type CryptoToken } from "@/lib/tokens";

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
      className="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 shadow-inner backdrop-blur-md sm:justify-start"
      role="tablist"
      aria-label="Select asset"
    >
      {CRYPTO_TOKEN_ORDER.map((t) => {
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
              "relative min-w-13 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 sm:min-w-16 sm:px-3 sm:text-sm",
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
