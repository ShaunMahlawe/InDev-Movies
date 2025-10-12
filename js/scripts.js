(() => {
    let currentIndex = 0;
    const videos = [];
    let userInteracted = false; 

    function updateVideos() {
        if (!videos.length) return;

        videos.forEach(v => {
            const item = v.closest('.carousel-item');
            const isActive = item && item.classList.contains('active');
            try {
                if (isActive) {
                    
                    v.muted = !userInteracted;
                    v.play().catch(err => {
                        v.muted = true; 
                        console.warn('Failed to play active video:', err);
                    });
                } else {
                   
                    v.pause();
                    v.currentTime = 0;
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
            currentIndex = items.length - 1;
        } else if (currentIndex >= items.length) {
            currentIndex = 0;
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
            v.muted = true;
            v.play().catch(() => {});
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
                    activeVideo.muted = true;
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

    document.addEventListener('DOMContentLoaded', () => {
    const movies = [
        { title: 'Movie 1', genre: 'Action', year: 2021, rating: 8.0 },
        { title: 'Movie 2', genre: 'Adventure', year: 2019, rating: 7.5 },
        { title: 'Movie 3', genre: 'Animation', year: 2020, rating: 9.0 },
        { title: 'Movie 4', genre: 'Biography', year: 2022, rating: 6.5 },
        { title: 'Movie 5', genre: 'Crime', year: 2018, rating: 8.5 },
        { title: 'Movie 6', genre: 'Comedy', year: 2023, rating: 7.0 },
        { title: 'Movie 7', genre: 'Documentary', year: 2021, rating: 7.8 },
        { title: 'Movie 8', genre: 'Drama', year: 2017, rating: 9.5 },
        { title: 'Movie 9', genre: 'Action', year: 2015, rating: 8.3 },
        { title: 'Movie 10', genre: 'Animation', year: 2020, rating: 8.7 },
    ];

    let selectedGenres = [];

    const movieListElement = document.getElementById('movie-list');
    const ratingInput = document.getElementById('rating');
    const ratingValueElement = document.getElementById('rating-value');

    function renderMovies() {
        if (!movieListElement) return;
        movieListElement.innerHTML = ''; // Clear existing movies

        const minRating = parseFloat(ratingInput.value || 0);
        
        // Filter movies
        const filteredMovies = movies.filter(movie => {
            return (
                (selectedGenres.length === 0 || selectedGenres.includes(movie.genre)) &&
                movie.rating >= minRating
            );
        });

        // Create movie card elements
        filteredMovies.forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.innerHTML = `
                <h3>${movie.title}</h3>
                <p>Genre: ${movie.genre}</p>
                <p>Year: ${movie.year}</p>
                <p>Rating: ${movie.rating}</p>
            `;
            movieListElement.appendChild(movieCard);
        });
    }

    // Handling genre filter button clicks
    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', () => {
            const genre = button.textContent.trim();
            button.classList.toggle('active');

            if (selectedGenres.includes(genre)) {
                selectedGenres = selectedGenres.filter(g => g !== genre);
            } else {
                selectedGenres.push(genre);
            }

            renderMovies();
        });
    });

    // Handling rating input change
    if (ratingInput && ratingValueElement) {
        ratingInput.addEventListener('input', () => {
            const ratingValue = ratingInput.value;
            ratingValueElement.textContent = ratingValue;
            renderMovies();
        });
    }

    // Initial rendering of movies
    renderMovies();
});



(function setupToggles() {
    const toggleButtons = Array.from(document.querySelectorAll('.toggle'));
    if (!toggleButtons.length) return;


    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const multi = btn.dataset.multi === 'true';
            const group = btn.closest('.toggle-buttons') || document;

            if (!multi) {

                group.querySelectorAll('.toggle').forEach(sib => sib.classList.remove('active'));
                btn.classList.add('active');
            } else {
                btn.classList.toggle('active');
            }


            const view = btn.dataset.view;
            const movieList = document.querySelector('.movie-list');
            if (view && movieList) {
                movieList.classList.toggle('list-view', view === 'list' && btn.classList.contains('active'));
                movieList.classList.toggle('grid-view', view === 'grid' && btn.classList.contains('active'));
            }

            document.dispatchEvent(new CustomEvent('toggleChange', {
                detail: { button: btn, multi, view, active: btn.classList.contains('active') }
            }));
        });
    });
})();
