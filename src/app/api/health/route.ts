import { NextResponse } from "next/server";

// Liveness probe. Route Handlers are uncached by default, so every request
// reflects a live server response.
export async function GET() {
  return NextResponse.json({ message: "Health Check" });
}
