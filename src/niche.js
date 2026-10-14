// Niche picker: shows a "Watch the video →" link for the selected niche.
// Loaded as its own script (no imports) so it keeps working even if the
// Supabase/form script fails to load.
function initNichePicker() {
  const select = document.getElementById('niche');
  const link = document.getElementById('niche-link');
  if (!select || !link) return;

  const update = () => {
    const url = select.selectedOptions[0]?.dataset.url;
    if (url) {
      link.href = url;
      link.hidden = false;
    } else {
      link.hidden = true;
      link.removeAttribute('href');
    }
  };

  select.addEventListener('change', update);
  update(); // handles a selection restored by the browser on back/refresh
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNichePicker);
} else {
  initNichePicker();
}
