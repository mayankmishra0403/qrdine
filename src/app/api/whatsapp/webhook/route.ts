import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const event = body.event as string | undefined;
    const instance = body.instance as string | undefined;
    const data = body.data as Record<string, unknown> | undefined;

    if (event === "connection.update" && data?.state) {
      console.log(`[Evolution Webhook] Instance ${instance}: ${data.state}`);
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
