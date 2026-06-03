import { NextRequest, NextResponse } from "next/server";

function buildRedirectUrl(req: NextRequest) {
  return new URL("/", req.nextUrl.origin);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const redirectUrl = buildRedirectUrl(req);

  redirectUrl.searchParams.set("payment_callback", "1");

  for (const field of [
    "razorpay_payment_id",
    "razorpay_order_id",
    "razorpay_signature",
  ]) {
    const value = formData.get(field);

    if (typeof value === "string") {
      redirectUrl.searchParams.set(field, value);
    }
  }

  return NextResponse.redirect(redirectUrl, 303);
}

export async function GET(req: NextRequest) {
  const redirectUrl = buildRedirectUrl(req);

  redirectUrl.searchParams.set("payment_callback", "1");

  for (const field of [
    "razorpay_payment_id",
    "razorpay_order_id",
    "razorpay_signature",
  ]) {
    const value = req.nextUrl.searchParams.get(field);

    if (value) {
      redirectUrl.searchParams.set(field, value);
    }
  }

  return NextResponse.redirect(redirectUrl, 303);
}
