import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";


export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "webhook secret not found" }, { status: 500 });
  }
  const event = req.body;
  const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(event)).digest("hex");
  logger.debug({ event, hash });
  return NextResponse.json({message:"webhook received successfully", hash: hash});
}
