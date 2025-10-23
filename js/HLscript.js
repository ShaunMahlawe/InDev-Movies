const video = document.getElementById('moviePlayer');
const feedback = document.getElementById('player-feedback');

let lastTime = 0; // Track previous time for skip detection

function showFeedback(icon, position = 'center') {
  if (!feedback) return;
  feedback.textContent = icon;

  // Remove previous position classes
  feedback.classList.remove('center', 'left', 'right', 'show');
  feedback.classList.add(position);

  // Trigger reflow to restart animation
  void feedback.offsetWidth;
  feedback.classList.add('show');

  setTimeout(() => feedback.classList.remove('show'), 600);
}

// Play/Pause feedback (center)
video.addEventListener('play', () => showFeedback('▶️', 'center'));
video.addEventListener('pause', () => showFeedback('⏸️', 'center'));
video.addEventListener('volumechange', () => {
  showFeedback(video.muted || video.volume === 0 ? '🔇' : '🔊', 'center');
});

// Detect skip forward/backward
video.addEventListener('timeupdate', () => {
  const diff = video.currentTime - lastTime;

  if (Math.abs(diff) >= 2) { // Detect jumps larger than ~2s
    if (diff > 0) {
      showFeedback('⏩', 'right'); // Forward
    } else {
      showFeedback('⏪', 'left');  // Backward
    }
  }

  lastTime = video.currentTime;
});
const trailerOverlay = document.getElementById('trailer-overlay');
const trailerVideo = document.getElementById('trailerVideo');

function hideTrailer() {
  trailerOverlay.style.display = 'none';
}

// Hide on click
trailerOverlay.addEventListener('click', hideTrailer);

// Hide when trailer ends
trailerVideo.addEventListener('ended', hideTrailer);
