import { NextRequest, NextResponse } from "next/server";

function buildRedirectUrl(req: NextRequest) {
  return new URL("/", req.nextUrl.origin);
}

async function readCallbackParams(req: NextRequest) {
  const params = new URLSearchParams();
  const fallbackReq = req.clone();

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();

      for (const [key, value] of Object.entries(body)) {
        if (typeof value === "string") {
          params.set(key, value);
        }
      }

      return params;
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      return new URLSearchParams(await req.text());
    }

    const formData = await req.formData();

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        params.set(key, value);
      }
    }

    return params;
  } catch {
    try {
      return new URLSearchParams(await fallbackReq.text());
    } catch {
      return params;
    }
  }
}

function redirectBridge(redirectUrl: URL) {
  const target = redirectUrl.toString();
  const escapedTarget = JSON.stringify(target);

  return new NextResponse(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="1;url=${target}" />
    <title>Returning to Shrivinayaka Astrology</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #fffaf0;
        color: #2b1b12;
        font-family: Arial, sans-serif;
        text-align: center;
      }
      .box {
        max-width: 420px;
        padding: 28px;
      }
      a {
        color: #8b0000;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Payment received</h1>
      <p>Returning to your report page...</p>
      <p><a href="${target}" target="_top">Continue to report</a></p>
    </div>
    <script>
      (function () {
        var target = ${escapedTarget};
        try {
          window.top.location.href = target;
        } catch (error) {
          window.location.href = target;
        }
      })();
    </script>
  </body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const callbackParams = await readCallbackParams(req);
  const redirectUrl = buildRedirectUrl(req);

  redirectUrl.searchParams.set("payment_callback", "1");

  for (const field of [
    "razorpay_payment_id",
    "razorpay_order_id",
    "razorpay_signature",
  ]) {
    const value = callbackParams.get(field);

    if (value) {
      redirectUrl.searchParams.set(field, value);
    }
  }

  return redirectBridge(redirectUrl);
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

  return redirectBridge(redirectUrl);
}
