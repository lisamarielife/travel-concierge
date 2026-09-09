import { getStore } from "@netlify/blobs";

function generateRandomPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async (req, context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    let body = {};
    try {
      body = await req.json();
    } catch (parseErr) {
      return new Response(JSON.stringify({ message: "Invalid JSON input." }), {
        status: 400,
        headers,
      });
    }

    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({ message: "Email is required." }), {
        status: 400,
        headers,
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Safely check Blobs storage
    let isPaid = null;
    try {
      const store = getStore("paid_customers");
      isPaid = await store.get(cleanEmail);
    } catch (blobErr) {
      console.error("Blobs lookup error:", blobErr);
    }

    if (!isPaid) {
      return new Response(
        JSON.stringify({
          message: "Email not recognised. Please double-check that you're using the same email address you used at purchase checkout. Still stuck? Contact lisamarieaicoach.com",
        }),
        {
          status: 403,
          headers,
        }
      );
    }

    const pin = generateRandomPin();

    if (!process.env.RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ message: "Missing RESEND_API_KEY in environment variables." }),
        {
          status: 500,
          headers,
        }
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Travel Concierge <travelconcierge@lisamarielife.com>",
        to: [cleanEmail],
        subject: "Your Travel Concierge Verification Code",
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-top: 0;">Verification Code</h2>
            <p style="font-size: 15px; color: #475569;">Here is your single-use access code for the Travel Concierge tool:</p>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e293b; background-color: #f8fafc; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0; border: 1px solid #e2e8f0;">
              ${pin}
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ message: "Resend API call failed." }));
      return new Response(
        JSON.stringify({ message: errData.message || "Failed to send email." }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        pin: pin,
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err.message || "Internal server error." }),
      {
        status: 500,
        headers,
      }
    );
  }
};
