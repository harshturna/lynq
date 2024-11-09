import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("-------------------------------------------");
    console.log("-----------------NEW ENTRY----------------");
    console.log("-------------------------------------------");
    console.log(body);
    console.log("-------------------------------------------");
    console.log("-----------------NEW END----------------");
    console.log("-------------------------------------------");

    const response = {
      success: "true",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.log("[CODE_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
