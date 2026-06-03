import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://shrivinayaka-backend.onrender.com";

const PENDING_REPORT_PAYLOAD_KEY = "shrivinayaka_pending_report_payload";
const COMPLETED_REPORT_KEY = "shrivinayaka_completed_report";
const PAYMENT_ERROR_KEY = "shrivinayaka_payment_error";

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

function callbackPage(params: URLSearchParams) {
  const payment = {
    razorpay_order_id: params.get("razorpay_order_id") || "",
    razorpay_payment_id: params.get("razorpay_payment_id") || "",
    razorpay_signature: params.get("razorpay_signature") || "",
  };

  return new NextResponse(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Generating Your Report</title>
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
        max-width: 520px;
        padding: 32px;
      }
      .loader {
        width: 54px;
        height: 54px;
        margin: 0 auto 22px;
        border: 6px solid #ead8b8;
        border-top-color: #8b0000;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      h1 {
        margin: 0 0 12px;
        color: #8b0000;
        font-size: 28px;
      }
      p {
        margin: 8px 0;
        line-height: 1.6;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    </style>
  </head>
  <body>
    <div class="box">
      <div class="loader"></div>
      <h1>Payment successful</h1>
      <p id="status">Generating your personalized astrology report...</p>
      <p>Please do not refresh this page.</p>
    </div>

    <script>
      (async function () {
        var API_BASE_URL = ${JSON.stringify(API_BASE_URL)};
        var PENDING_KEY = ${JSON.stringify(PENDING_REPORT_PAYLOAD_KEY)};
        var COMPLETED_KEY = ${JSON.stringify(COMPLETED_REPORT_KEY)};
        var ERROR_KEY = ${JSON.stringify(PAYMENT_ERROR_KEY)};
        var payment = ${JSON.stringify(payment)};
        var status = document.getElementById("status");

        function fail(message) {
          sessionStorage.setItem(ERROR_KEY, message);
          window.location.replace("/?payment_error=1");
        }

        try {
          if (
            !payment.razorpay_order_id ||
            !payment.razorpay_payment_id ||
            !payment.razorpay_signature
          ) {
            fail("Payment successful, but payment details were not returned. Please contact support.");
            return;
          }

          var pendingPayloadText = sessionStorage.getItem(PENDING_KEY);

          if (!pendingPayloadText) {
            fail(
              "Payment successful, but report details were lost. Please contact support with payment ID: " +
                payment.razorpay_payment_id
            );
            return;
          }

          var pendingPayload = JSON.parse(pendingPayloadText);

          status.textContent = "Verifying your payment...";
          var verifyResponse = await fetch(API_BASE_URL + "/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payment)
          });

          var verifyData = await verifyResponse.json().catch(function () {
            return {};
          });

          if (!verifyResponse.ok || !verifyData.success) {
            fail(
              "Payment successful, but verification failed. Please contact support with payment ID: " +
                payment.razorpay_payment_id
            );
            return;
          }

          status.textContent = "Preparing your astrology report...";
          var reportPayload = Object.assign({}, pendingPayload, {
            report_type: "premium",
            payment_token: verifyData.payment_token,
            payment_id: payment.razorpay_payment_id
          });

          var reportResponse = await fetch(API_BASE_URL + "/generate-report", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(reportPayload)
          });

          var reportText = await reportResponse.text();

          if (!reportResponse.ok) {
            fail(
              "Payment successful, but report generation failed. Please contact support with payment ID: " +
                payment.razorpay_payment_id
            );
            return;
          }

          var reportData = JSON.parse(reportText);
          sessionStorage.setItem(COMPLETED_KEY, JSON.stringify(reportData));
          sessionStorage.removeItem(PENDING_KEY);
          window.location.replace("/?report_ready=1");
        } catch (error) {
          fail(
            "Payment successful, but report generation failed. Please contact support with payment ID: " +
              (payment.razorpay_payment_id || "not available")
          );
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
  return callbackPage(await readCallbackParams(req));
}

export async function GET(req: NextRequest) {
  return callbackPage(req.nextUrl.searchParams);
}
