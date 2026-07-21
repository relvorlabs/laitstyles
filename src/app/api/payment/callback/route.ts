import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";


export async function POST(req: NextRequest) {

    const event = req.body;
    logger.debug({event});
    return NextResponse.json({ message: "success" });
}