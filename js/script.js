// main.js — handles UI interactions for indiv-movies.html

// Handle active tab switching
document.querySelectorAll('.anw-tabs .nav-link').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.anw-tabs .nav-link').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// Player feedback
const feedback = document.getElementById('player-feedback');

function showFeedback(icon) {
  if (!feedback) return;
  feedback.textContent = icon;
  feedback.classList.add('show');
  setTimeout(() => feedback.classList.remove('show'), 600);
}

// Player buttons
document.querySelector('.btn-back')?.addEventListener('click', () => showFeedback('⏪'));
document.querySelector('.btn-play')?.addEventListener('click', () => showFeedback('⏯️'));
document.querySelector('.btn-forward')?.addEventListener('click', () => showFeedback('⏩'));
document.querySelector('.btn-mute')?.addEventListener('click', () => showFeedback('🔇'));
