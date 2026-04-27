import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Intentionally disabled: frontend now consumes Binance directly via:
  // wss://stream.binance.com:9443/ws/${sym}@trade
  // Keeping this endpoint only as an explicit marker for that architecture.
  void req;
  return NextResponse.json(
    {
      error:
        "Disabled route. This app uses direct frontend WebSocket to Binance.",
    },
    { status: 410 }
  );
}
