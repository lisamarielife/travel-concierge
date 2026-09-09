document.addEventListener('DOMContentLoaded', () => {
  // Check if session is already verified
  if (sessionStorage.getItem('tc_verified') === 'true') {
    return;
  }

  // Create overlay markup
  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  overlay.innerHTML = `
    <div class="auth-card">
      <h2>Travel Concierge</h2>
      <p id="auth-desc">Enter the email address you used on purchase to receive your 6-digit access PIN.</p>
      
      <div id="step-email">
        <input type="email" id="user-email" class="auth-input" placeholder="your@email.com" />
        <button id="btn-send-pin" class="auth-btn">Send access PIN</button>
      </div>

      <div id="step-pin" style="display: none;">
        <input type="text" id="user-pin" class="auth-input" placeholder="6-digit PIN" maxlength="6" />
        <button id="btn-verify-pin" class="auth-btn">Verify and unlock</button>
      </div>

      <div id="auth-error" class="auth-error"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  let generatedPin = null;

  const emailStep = document.getElementById('step-email');
  const pinStep = document.getElementById('step-pin');
  const emailInput = document.getElementById('user-email');
  const pinInput = document.getElementById('user-pin');
  const sendBtn = document.getElementById('btn-send-pin');
  const verifyBtn = document.getElementById('btn-verify-pin');
  const errorDiv = document.getElementById('auth-error');
  const descText = document.getElementById('auth-desc');

  function showError(msg) {
    errorDiv.innerText = msg;
    errorDiv.style.display = 'block';
  }

  function hideError() {
    errorDiv.style.display = 'none';
  }

  // Step 1: Send PIN
  sendBtn.addEventListener('click', async () => {
    hideError();
    const email = emailInput.value.trim();

    if (!email) {
      showError('Please enter your email address.');
      return;
    }

    sendBtn.innerText = 'Checking purchase...';
    sendBtn.disabled = true;

    try {
      const res = await fetch('/.netlify/functions/send-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Verification failed.');
      }

      generatedPin = data.pin;
      emailStep.style.display = 'none';
      pinStep.style.display = 'block';
      descText.innerText = `We sent a 6-digit PIN to ${email}. Enter it below. Don't see it? Check your spam or junk folder and if it's not there contact lisamarieaicoach.com`;
    } catch (err) {
      showError(err.message);
      sendBtn.innerText = 'Send Access PIN';
      sendBtn.disabled = false;
    }
  });

  // Step 2: Verify PIN
  verifyBtn.addEventListener('click', () => {
    hideError();
    const enteredPin = pinInput.value.trim();

    if (enteredPin === generatedPin) {
      sessionStorage.setItem('tc_verified', 'true');
      overlay.remove();
    } else {
      showError('Incorrect PIN. Please check your email and try again. Still having trouble? Contact lisamarieaicoach.com');
    }
  });
});
