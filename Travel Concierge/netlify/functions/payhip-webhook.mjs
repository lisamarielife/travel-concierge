import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const data = await req.json();
    const buyerEmail = data.email ? data.email.toLowerCase().trim() : null;

    if (buyerEmail) {
      const store = getStore("paid_customers");
      await store.set(buyerEmail, JSON.stringify({ paid: true, date: new Date().toISOString() }));
      return new Response(JSON.stringify({ message: "Buyer saved" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No email found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
