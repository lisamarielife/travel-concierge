const { getStore } = require("@netlify/blobs");

function generateRandomPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.handler = async function (event, context) {
  const headers = { 
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (parseErr) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Invalid JSON input." }),
      };
    }

    const { email } = body;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Email is required." }),
      };
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
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          message: "No active purchase found for this email. Please complete checkout first.",
        }),
      };
    }

    const pin = generateRandomPin();

    if (!process.env.RESEND_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: "Missing RESEND_API_KEY in environment variables." }),
      };
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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: errData.message || "Failed to send email." }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pin: pin,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: err.message || "Internal server error." }),
    };
  }
};