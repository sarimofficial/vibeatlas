import { NextResponse } from "next/server";
import { buildPlan } from "@/lib/plan";
import type { PlanRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

function toStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") return v.split(/[,\n]+/);
  return [];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<PlanRequest> & {
      likesText?: string;
    };
    const likes =
      body.likes && body.likes.length > 0
        ? body.likes
        : toStringList(body.likesText);
    const input: PlanRequest = {
      likes: likes.map(String),
      city: typeof body.city === "string" ? body.city : undefined,
      budget: typeof body.budget === "string" ? body.budget : undefined,
      timeAvailable:
        typeof body.timeAvailable === "string" ? body.timeAvailable : undefined,
      avoid: toStringList(body.avoid),
      excluded: toStringList(body.excluded),
      keep: Array.isArray(body.keep) ? (body.keep as PlanRequest["keep"]) : undefined,
      replaceSlot: body.replaceSlot,
      surprise: body.surprise === true,
    };
    if (input.likes.filter((s) => s.trim()).length === 0) {
      return NextResponse.json(
        { error: "Enter at least one thing you love." },
        { status: 400 },
      );
    }
    const plan = await buildPlan(input);
    return NextResponse.json(plan);
  } catch (e) {
    const err = e as Error & { status?: number };
    // Live Qloo failures surface as 502; they are NEVER silently
    // replaced with demo data (see lib/plan.ts).
    return NextResponse.json(
      { error: err.message || "Plan failed." },
      { status: err.status ?? 500 },
    );
  }
}
