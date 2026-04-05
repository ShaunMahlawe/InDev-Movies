/**
 * auth-carousel.js
 * Powers the split-screen auth page:
 *  - Fetches trending movies from TMDB and runs the left-panel backdrop + poster carousel
 *  - Handles login ↔ signup form toggle (both via in-form links and left-panel header buttons)
 */
(function () {
  'use strict';

  /* ─── TMDB constants ─── */
  var TMDB_URL      = 'https://api.themoviedb.org/3/trending/movie/week';
  var IMG_BACKDROP  = 'https://image.tmdb.org/t/p/w1280';
  var IMG_POSTER    = 'https://image.tmdb.org/t/p/w500';
  var SLIDE_MS      = 6000;

  /* ─── Carousel state ─── */
  var movies     = [];
  var currentIdx = 0;
  var timer      = null;

  /* ─── DOM refs: carousel ─── */
  var bgLayer   = document.getElementById('carouselBackdrop');
  var bgNext    = document.getElementById('carouselBackdropNext');
  var posterImg = document.getElementById('carouselPoster');
  var titleEl   = document.getElementById('carouselTitle');
  var subEl     = document.getElementById('carouselSub');
  var dotsWrap  = document.getElementById('carouselDots');
  var prevBtn   = document.getElementById('carouselPrev');
  var nextBtn   = document.getElementById('carouselNext');

  /* ─── DOM refs: auth toggle ─── */
  var loginForm      = document.getElementById('loginForm');
  var signupForm     = document.getElementById('signupForm');
  var headingEl      = document.getElementById('authHeading');
  var subheadEl      = document.getElementById('authSubheading');
  var ctabSignUp     = document.getElementById('ctabSignUp');
  var ctabLogIn      = document.getElementById('ctabLogIn');
  var switchToSignup = document.getElementById('switchToSignup');
  var switchToLogin  = document.getElementById('switchToLogin');

  /* ══════════════════════════════════════
     AUTH FORM TOGGLE
  ══════════════════════════════════════ */

  function showLogin() {
    if (!loginForm || !signupForm) return;
    loginForm.classList.remove('auth-form--hidden');
    signupForm.classList.add('auth-form--hidden');
    if (headingEl)  headingEl.textContent  = 'Hi, Movie Lover';
    if (subheadEl)  subheadEl.textContent  = 'Welcome back — sign in to continue';
    if (ctabLogIn)  ctabLogIn.classList.add('ctab-btn--active');
    if (ctabSignUp) ctabSignUp.classList.remove('ctab-btn--active');
  }

  function showSignup() {
    if (!loginForm || !signupForm) return;
    signupForm.classList.remove('auth-form--hidden');
    loginForm.classList.add('auth-form--hidden');
    if (headingEl)  headingEl.textContent  = 'Create Account';
    if (subheadEl)  subheadEl.textContent  = 'Join InDev Movies — it\'s free';
    if (ctabSignUp) ctabSignUp.classList.add('ctab-btn--active');
    if (ctabLogIn)  ctabLogIn.classList.remove('ctab-btn--active');
  }

  if (ctabLogIn)      ctabLogIn.addEventListener('click', showLogin);
  if (ctabSignUp)     ctabSignUp.addEventListener('click', showSignup);
  if (switchToSignup) switchToSignup.addEventListener('click', function (e) { e.preventDefault(); showSignup(); });
  if (switchToLogin)  switchToLogin.addEventListener('click', function (e) { e.preventDefault(); showLogin(); });

  /* ─── Password visibility toggle ─── */
  Array.from(document.querySelectorAll('[data-toggle-password]')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-toggle-password');
      var input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;

      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? 'Hide' : 'Show';
      btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
      btn.setAttribute('aria-label', (isHidden ? 'Hide' : 'Show') + ' password');
    });
  });

  /* ══════════════════════════════════════
     CAROUSEL
  ══════════════════════════════════════ */

  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    movies.forEach(function (_, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      btn.setAttribute('aria-label', 'Slide ' + (i + 1));
      btn.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(btn);
    });
  }

  function setDot(idx) {
    if (!dotsWrap) return;
    Array.from(dotsWrap.children).forEach(function (d, i) {
      d.classList.toggle('active', i === idx);
    });
  }

  function showSlide(idx) {
    if (!movies.length) return;
    var m      = movies[idx];
    var bdUrl  = IMG_BACKDROP + m.backdrop_path;
    var pUrl   = IMG_POSTER + m.poster_path;
    var year   = (m.release_date || '').slice(0, 4);
    var rating = m.vote_average ? Number(m.vote_average).toFixed(1) : '';

    /* Crossfade backdrop */
    if (bgNext) {
      bgNext.style.backgroundImage = "url('" + bdUrl + "')";
      bgNext.classList.add('visible');
      setTimeout(function () {
        if (bgLayer) bgLayer.style.backgroundImage = "url('" + bdUrl + "')";
        bgNext.classList.remove('visible');
      }, 700);
    } else if (bgLayer) {
      bgLayer.style.backgroundImage = "url('" + bdUrl + "')";
    }

    /* Fade poster */
    if (posterImg) {
      posterImg.style.opacity = '0';
      setTimeout(function () {
        posterImg.src           = pUrl;
        posterImg.alt           = m.title || '';
        posterImg.style.opacity = '1';
      }, 350);
    }

    /* Fade text */
    if (titleEl) {
      titleEl.style.opacity = '0';
      setTimeout(function () {
        titleEl.textContent   = m.title || m.name || '';
        titleEl.style.opacity = '1';
      }, 350);
    }
    if (subEl) {
      subEl.style.opacity = '0';
      setTimeout(function () {
        subEl.textContent   = [year, rating ? '\u2605 ' + rating : ''].filter(Boolean).join(' \u00b7 ');
        subEl.style.opacity = '1';
      }, 400);
    }

    setDot(idx);
    currentIdx = idx;
  }

  function goTo(idx) {
    stopTimer();
    showSlide(idx);
    startTimer();
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(function () {
      showSlide((currentIdx + 1) % movies.length);
    }, SLIDE_MS);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function showFallback() {
    if (bgLayer) bgLayer.style.background = 'linear-gradient(135deg, #0d0f1f 0%, #1a1030 100%)';
    if (titleEl) titleEl.textContent = 'Trending This Week';
    if (subEl)   subEl.textContent   = '';
    if (posterImg) posterImg.style.opacity = '0';
  }

  async function fetchTrending() {
    var token  = window.TMDB_BEARER_TOKEN;
    var apiKey = window.TMDB_API_KEY;

    if (!token && !apiKey) {
      showFallback();
      return;
    }

    var url     = TMDB_URL;
    var headers = {};

    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    } else {
      url += '?api_key=' + encodeURIComponent(apiKey);
    }

    try {
      var res  = await fetch(url, { headers: headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      movies = (data.results || [])
        .filter(function (m) { return m.backdrop_path && m.poster_path; })
        .slice(0, 8);

      if (!movies.length) { showFallback(); return; }

      buildDots();
      showSlide(0);
      startTimer();
    } catch (err) {
      console.warn('[AuthCarousel] Could not load trending movies:', err.message);
      showFallback();
    }
  }

  /* ─── Nav buttons ─── */
  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      goTo((currentIdx - 1 + movies.length) % movies.length);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      goTo((currentIdx + 1) % movies.length);
    });
  }

  /* ─── Pause auto-slide on hover ─── */
  var carouselEl = document.getElementById('authCarousel');
  if (carouselEl) {
    carouselEl.addEventListener('mouseenter', stopTimer);
    carouselEl.addEventListener('mouseleave', function () { if (movies.length) startTimer(); });
  }

  /* ─── Boot ─── */
  /* Check localStorage to determine default form for returning vs. new users */
  if (localStorage.getItem('hasVisitedBefore') === 'true') {
    showLogin();
  } else {
    showSignup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchTrending);
  } else {
    fetchTrending();
  }
}());
