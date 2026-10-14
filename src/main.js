import { supabase } from './supabase.js';

const form = document.getElementById('feedback-form');
const wrap = document.getElementById('form-wrap');
const button = document.getElementById('submit-btn');
const errorEl = document.getElementById('form-error');
const fields = ['q1_goal', 'q2_letdown', 'q3_comparison', 'q4_wishlist'];

// Auto-grow textareas (fallback for browsers without CSS field-sizing)
const supportsFieldSizing = CSS.supports('field-sizing', 'content');
function autoGrow(el) {
  if (supportsFieldSizing) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + 4}px`; // + border
}
form.querySelectorAll('textarea').forEach((el) => {
  el.addEventListener('input', () => autoGrow(el));
});

const nicheSelect = document.getElementById('niche');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const row = Object.fromEntries(fields.map((name) => [name, form.elements[name].value.trim()]));

  if (fields.every((name) => !row[name])) {
    showError('Please answer at least one question before submitting.');
    return;
  }

  if (!supabase) {
    showError('Submissions aren’t set up yet. Please try again later.');
    console.warn('[supabase] Submit blocked: client not configured.');
    return;
  }

  button.disabled = true;
  button.textContent = 'Sending...';

  const { error } = await supabase
    .from('feedback_responses')
    .insert({ ...row, niche: nicheSelect.value || null });

  if (error) {
    console.error('[supabase] Insert failed:', error);
    showError('Something went wrong sending your answers. Your responses are still here — please try again.');
    button.disabled = false;
    button.textContent = 'Submit';
    return;
  }

  wrap.innerHTML = `
    <div class="thanks" role="status">
      <h2>Thank you!</h2>
      <p>Your answers have been received. We really appreciate you taking the time.</p>
    </div>
  `;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
