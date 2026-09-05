const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const buyerEmail = data.email ? data.email.toLowerCase().trim() : null;

    if (buyerEmail) {
      const store = getStore('paid_customers');
      await store.set(buyerEmail, JSON.stringify({ paid: true, date: new Date().toISOString() }));
      return { statusCode: 200, body: JSON.stringify({ message: 'Buyer saved' }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'No email found' }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};