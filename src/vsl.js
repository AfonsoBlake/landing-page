// "Tap for sound" overlay for the VSL.
// The embed autoplays muted (browsers require it); the first tap on the
// overlay unmutes, restarts from 0 and plays, then the overlay goes away
// and YouTube's own controls take over.
// Loaded as its own script (no imports) so nothing else can break it.
const overlay = document.getElementById('sound-overlay');
let player = null;
let ready = false;

function hideOverlay() {
  overlay.hidden = true;
}

overlay.addEventListener('click', () => {
  if (ready) {
    // All calls happen synchronously inside the tap so iOS/Android treat
    // the unmuted playback as user-initiated.
    player.unMute();
    player.setVolume(100);
    player.seekTo(0, true);
    player.playVideo();
  } else {
    // API not loaded (slow network or blocked) — get out of the way so the
    // native YouTube controls can be used instead.
    console.warn('[vsl] YouTube API not ready; falling back to native controls.');
  }
  hideOverlay();
});

function createPlayer() {
  player = new window.YT.Player('vsl-player', {
    events: {
      onReady: () => {
        ready = true;
      },
    },
  });
}

if (window.YT && window.YT.Player) {
  createPlayer();
} else {
  const previous = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    previous?.();
    createPlayer();
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.async = true;
  document.head.appendChild(tag);
}
