let currentIndex = 0;
let videos = [];
let userInteracted = false;

function updateVideos() {
    if (!videos || videos.length === 0) return;
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
                console.log('Ensuring active video is playing (muted=', v.muted, ')');
            } else {
                v.pause();
                try { v.currentTime = 0; } catch (e) {}
                v.muted = true;
                console.log('Muting & pausing non-active video');
            }
        } catch (e) {
            console.error('updateVideos error', e);
        }
    });
}

function moveCarousel(direction) {
    const items = document.querySelectorAll('.carousel-item');
    if (!items || items.length === 0) return;

    console.log(`Current index before move: ${currentIndex}`);
    if (currentIndex < 0 || currentIndex >= items.length) currentIndex = 0;
    items[currentIndex].classList.remove('active');

    currentIndex += direction;

    if (currentIndex < 0) {
        currentIndex = items.length - 1;
        console.log('Moved to last item');
    } else if (currentIndex >= items.length) {
        currentIndex = 0;
        console.log('Moved to first item');
    }

    items[currentIndex].classList.add('active');
    console.log(`Current index after move: ${currentIndex}`);

    const carouselContainer = document.querySelector('.carousel-inner');
    const offset = -currentIndex * 100;
    if (carouselContainer) {
        carouselContainer.style.transform = `translateX(${offset}%)`;
        console.log(`Carousel translated to: ${offset}%`);
    }

    updateVideos();
}

const prevBtn = document.querySelector('.carousel-control-prev');
if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        console.log('Previous button clicked');
        moveCarousel(-1);
    });
}

const nextBtn = document.querySelector('.carousel-control-next');
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        console.log('Next button clicked');
        moveCarousel(1);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.getElementById('heroCarousel');
    if (!carousel) {
        console.warn('No #heroCarousel found');
    } else {
        videos = Array.from(carousel.querySelectorAll('video'));
        console.log(`Found ${videos.length} videos in the carousel`);

        const bsInstance = bootstrap?.Carousel?.getOrCreateInstance
        ? bootstrap.Carousel.getOrCreateInstance(carousel)
        : null;

        videos.forEach(v => {
            try {
                v.playsInline = true;
                v.preload = 'metadata';
                v.muted = true; 
                v.play().catch(() => {
                });
                console.log('Video prepared (muted) on load');
            } catch (e) {
                console.warn('Error preparing video', e);
            }
        });

        updateVideos();

        carousel.addEventListener('slid.bs.carousel', () => {
            console.log('Carousel slid event triggered');
            const items = Array.from(document.querySelectorAll('.carousel-item'));
            const activeIndex = items.findIndex(it => it.classList.contains('active'));
            if (activeIndex >= 0) currentIndex = activeIndex;
            updateVideos();
        });

        function tryUnmuteActive() {
            if (!carousel) return;
            userInteracted = true;
            const activeVideo = carousel.querySelector('.carousel-item.active video');
            if (activeVideo) {
                try {
                    activeVideo.muted = false;
                    const p = activeVideo.play();
                    if (p && typeof p.then === 'function') {
                        p.then(() => console.log('Playing active video after user gesture'))
                         .catch(err => {
                             console.warn('Play with sound blocked:', err);
                             activeVideo.muted = true;
                         });
                    } else {
                        console.log('Play attempted (no promise)');
                    }
                } catch (e) {
                    console.warn('Error unmuting/playing active video', e);
                }
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
    }

    /* ---------- movies / filters section (safe guards) ---------- */
    const movies = [
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
        if (!movieListElement) return;
        movieListElement.innerHTML = '';

        const minRating = ratingInput ? parseFloat(ratingInput.value || 0) : 0;

        const filteredMovies = movies.filter(movie => {
            return (
                (selectedGenres.length === 0 || selectedGenres.includes(movie.genre)) &&
                movie.rating >= minRating
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

    if (ratingInput && ratingValueElement) {
        ratingInput.addEventListener('input', () => {
            const ratingValue = ratingInput.value;
            ratingValueElement.textContent = ratingValue;
            renderMovies();
        });
    }

    renderMovies();
});

document.addEventListener('DOMContentLoaded', () => {
    const movies = [
        {
            title: 'Deadpool 2',
            genre: 'Action',
            year: 2018,
            rating: 8.1,
            description: 'The merc with a mouth returns for more action and hilarious antics.',
            trailer: 'path/to/deadpool2_trailer.mp4'
        },
        {
            title: 'The Meg',
            genre: 'Action',
            year: 2018,
            rating: 6.4,
            description: 'A deep-sea submersible is attacked by a giant prehistoric shark.',
            trailer: 'path/to/meg_trailer.mp4'
        },
    ];

    const movieListElement = document.getElementById('movie-list');
    const ratingInput = document.getElementById('rating');
    const ratingValueElement = document.getElementById('rating-value');
    const trailerModal = document.getElementById('trailer-modal');
    const closeModal = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const trailerVideo = document.getElementById('trailer-video');
    const videoSource = document.getElementById('video-source');

    function renderMovies() {
        if (!movieListElement) return;

        movieListElement.innerHTML = ''; // Clear existing movies
        const minRating = parseFloat(ratingInput.value || 0);

        const filteredMovies = movies.filter(movie => movie.rating >= minRating);

        filteredMovies.forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.innerHTML = `
                <h3>${movie.title}</h3>
                <p>${movie.year}</p>
                <p>Rating: ${movie.rating}</p>
            `;
            movieCard.addEventListener('click', () => showTrailer(movie));
            movieListElement.appendChild(movieCard);
        });
    }

    function showTrailer(movie) {
        modalTitle.textContent = movie.title;
        modalDescription.textContent = movie.description;
        videoSource.src = movie.trailer;
        trailerVideo.load();
        trailerModal.style.display = 'flex';
    }

    closeModal.addEventListener('click', () => {
        trailerModal.style.display = 'none';
        trailerVideo.pause(); // Stop video playback
        videoSource.src = ''; // Clear source to stop loading
    });

    ratingInput.addEventListener('input', () => {
        const ratingValue = ratingInput.value;
        ratingValueElement.textContent = ratingValue;
        renderMovies();
    });

    renderMovies(); // Initial rendering of movies
});

// Additional scripts can be added here as needed 

document.addEventListener('DOMContentLoaded', () => {
    const contentRadios = document.querySelectorAll('input[name="content_type"]');
    const headerTitle = document.querySelector('.content-selector'); // Assuming the title is inside this

    // Function to update the title text
    const updateTitle = (type) => {
        // Simple logic to change a visible title (if we had one separate from the radio buttons)
        // Since we are styling the radio labels, this is more for demonstrating content change
        console.log(`Switched view to: ${type.toUpperCase()}`);
    };

    // Event listener for content selection
    contentRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            // The value is 'movies', 'series', or 'original'
            const selectedType = event.target.value;
            updateTitle(selectedType);

            // In a real application, you would load different data here:
            // loadContent(selectedType);
        });
    });

    // Handle closing the featured section
    const closeButton = document.querySelector('.featured-hero .close-btn');
    const featuredHero = document.querySelector('.featured-hero');

    if (closeButton && featuredHero) {
        closeButton.addEventListener('click', () => {
            // Hides the entire featured section (or could add a class to animate it)
            featuredHero.style.display = 'none';
        });
    }

    // Handle genre button clicks (Example: toggling the active class)
    const genreTags = document.querySelectorAll('.genre-tags .tag');
    genreTags.forEach(tag => {
        tag.addEventListener('click', () => {
            // Remove active from all other tags
            genreTags.forEach(t => t.classList.remove('active'));
            // Add active class to the clicked tag
            tag.classList.add('active');
            
            // In a real application, you would filter the grid data here:
            // filterGrid(tag.textContent); 
        });
    });
});
