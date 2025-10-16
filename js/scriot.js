
document.querySelectorAll('.anw-tabs .nav-link').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.anw-tabs .nav-link').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

const feedback = document.getElementById('player-feedback');

function showFeedback(icon) {
  if (!feedback) return;
  feedback.textContent = icon;
  feedback.classList.add('show');
  setTimeout(() => feedback.classList.remove('show'), 600);
}

document.querySelector('.btn-back')?.addEventListener('click', () => showFeedback('⏪'));
document.querySelector('.btn-play')?.addEventListener('click', () => showFeedback('⏯️'));
document.querySelector('.btn-forward')?.addEventListener('click', () => showFeedback('⏩'));
document.querySelector('.btn-mute')?.addEventListener('click', () => showFeedback('🔇'));
