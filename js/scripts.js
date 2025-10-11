(() => {
    let currentIndex = 0;
    const videos = [];
    let userInteracted = false; // Track first real user gesture

    function updateVideos() {
        if (!videos.length) return;

        videos.forEach(v => {
            const item = v.closest('.carousel-item');
            const isActive = item && item.classList.contains('active');
            try {
                if (isActive) {
                    // Always ensure an active video is playing (muted if user hasn't interacted)
                    v.muted = !userInteracted;
                    v.play().catch(err => {
                        v.muted = true; // Keep muted if play fails
                        console.warn('Failed to play active video:', err);
                    });
                } else {
                    // Pause and mute non-active videos to save CPU
                    v.pause();
                    v.currentTime = 0; // Reset time to 0
                    v.muted = true;
                }
            } catch (e) {
                console.error('updateVideos error', e);
            }
        });
    }

    function moveCarousel(direction) {
        const items = document.querySelectorAll('.carousel-item');
        if (!items.length) return;

        items[currentIndex].classList.remove('active');

        currentIndex += direction;

        if (currentIndex < 0) {
            currentIndex = items.length - 1; // Wrap to last item
        } else if (currentIndex >= items.length) {
            currentIndex = 0; // Wrap to first item
        }

        items[currentIndex].classList.add('active');
        updateCarouselTransform();

        updateVideos();
    }

    function updateCarouselTransform() {
        const carouselContainer = document.querySelector('.carousel-inner');
        if (carouselContainer) {
            const offset = -currentIndex * 100;
            carouselContainer.style.transform = `translateX(${offset}%)`;
        }
    }

    const prevBtn = document.querySelector('.carousel-control-prev');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => moveCarousel(-1));
    }

    const nextBtn = document.querySelector('.carousel-control-next');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => moveCarousel(1));
    }

    document.addEventListener('DOMContentLoaded', () => {
        const carousel = document.getElementById('heroCarousel');
        if (!carousel) return;

        videos.push(...carousel.querySelectorAll('video'));
        videos.forEach(v => {
            v.playsInline = true;
            v.preload = 'metadata';
            v.muted = true; // Start muted for autoplay
            v.play().catch(() => {}); // Ignore autoplay block errors
        });

        updateVideos();

        carousel.addEventListener('slid.bs.carousel', () => {
            const items = Array.from(document.querySelectorAll('.carousel-item'));
            const activeIndex = items.findIndex(it => it.classList.contains('active'));
            if (activeIndex >= 0) currentIndex = activeIndex;
            updateVideos();
        });

        function tryUnmuteActive() {
            userInteracted = true;
            const activeVideo = carousel.querySelector('.carousel-item.active video');
            if (activeVideo) {
                activeVideo.muted = false;
                activeVideo.play().catch(err => {
                    activeVideo.muted = true; // Keep muted if play fails
                });
            }
            removeGestureListeners();
            updateVideos();
        }

        function onKey(e) {
            if (e.key === ' ' || e.key === 'Enter') tryUnmuteActive();
        }

        function removeGestureListeners() {
            document.removeEventListener('pointerdown', tryUnmuteActive);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('click', tryUnmuteActive);
        }

        document.addEventListener('pointerdown', tryUnmuteActive, { passive: true });
        document.addEventListener('click', tryUnmuteActive, { passive: true });
        document.addEventListener('keydown', onKey);
    });

    // Movie filtering sectionconst movies = [
    { title: 'Movie 1', genre: 'Action', year: 2021, rating: 8.0 },
    { title: 'Movie 2', genre: 'Comedy', year: 2019, rating: 7.5 },
    { title: 'Movie 3', genre: 'Drama', year: 2020, rating: 9.0 },
    { title: 'Movie 4', genre: 'Animation', year: 2022, rating: 6.5 },
    { title: 'Movie 5', genre: 'Crime', year: 2018, rating: 8.5 },
    { title: 'Movie 6', genre: 'Documentary', year: 2023, rating: 7.0 },
];

let selectedGenres = [];

const movieListElement = document.getElementById('movie-list');
const ratingInput = document.getElementById('rating');
const ratingValueElement = document.getElementById('rating-value');

function renderMovies() {
    movieListElement.innerHTML = ''; // Clear existing movies

    const filteredMovies = movies.filter(movie => {
        const rating = parseFloat(ratingInput.value);
        return (
            (selectedGenres.length === 0 || selectedGenres.includes(movie.genre)) &&
            movie.rating >= rating
        );
    });

    filteredMovies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.innerHTML = `<h3>${movie.title}</h3><p>${movie.genre}</p><p>Rating: ${movie.rating}</p>`;
        movieListElement.appendChild(movieCard);
    });
}

document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', () => {
        const genre = button.textContent;
        button.classList.toggle('active');

        if (selectedGenres.includes(genre)) {
            selectedGenres = selectedGenres.filter(g => g !== genre);
        } else {
            selectedGenres.push(genre);
        }

        renderMovies(); // Re-render the movie list
    });
});

ratingInput.addEventListener('input', () => {
    const ratingValue = ratingInput.value;
    ratingValueElement.textContent = ratingValue;
    renderMovies(); // Re-render the movie list
});

// Initial render
renderMovies();