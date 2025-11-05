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
});

class Movie{
    constructor(title, rating, link, image){
        this.title = title;
        this.rating = rating;
        this.link = link;
        this.image = image;
    }
}

(async function() {
    const url = 'https://imdb236.p.rapidapi.com/api/imdb/top-box-office';
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': 'ecdd572f6fmsh055b23482742d2cp1af123jsn9b1d66941f6f',
            'x-rapidapi-host': 'imdb236.p.rapidapi.com'
        }
    };

    let data = null;
    try {
        const resp = await fetch(url, options);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

        // parse result
        data = await resp.json();
        console.log('Full API response:', data);

        const list = Array.isArray(data) ? data : (data.array || data.items || data.results || data.titles || []);
        if (!Array.isArray(list) || list.length === 0) {
            console.warn('No movies array in response');
            return;
        }

        const first25 = list.slice(0, 25);

        const container = document.getElementById('movieCards') || document.getElementById('movie-container');
        if (!container) {
            console.error('No #movieCards or #movie-container element found');
            return;
        }

        container.classList.add('movie-grid');

        container.innerHTML = first25.map(item => {
            const image = (item.primaryImage && (item.primaryImage.url || item.primaryImage)) || item.image || item.poster || '';
            const title = item.primaryTitle || item.title || item.name || 'Untitled';
            const year = item.releaseDate || item.year || item.releaseYear || '';
            const description = item.description || item.plot || item.summary || '';
            const link = (item.trailer && (item.trailer.url || item.trailer)) || item.link || '#';

            return makeCardHTML({
                image,
                title,
                year,
                description,
                link
            });
        }).join('');

        container.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.btn-add-list');
            if (addBtn) {
                e.preventDefault();
                const title = addBtn.dataset.title;
                const img = addBtn.dataset.image;
                const year = addBtn.dataset.year;
                const link = addBtn.dataset.link || '#';

            
                addBtn.classList.toggle('active');
                addBtn.textContent = addBtn.classList.contains('active') ? 'Added' : 'Add List';

            
                const key = 'userMovieList';
                let list = [];
                try {
                    list = JSON.parse(localStorage.getItem(key) || '[]');
                } catch (err) { list = []; }
                if (addBtn.classList.contains('active')) {
                
                    if (!list.some(m => m.title === title)) list.push({ title, image: img, year, link });
                } else {
                    list = list.filter(m => m.title !== title);
                }
                try { localStorage.setItem(key, JSON.stringify(list)); } catch (err) { console.warn('Could not save list', err); }
                return;
            }
        }, { passive: true });

        container.querySelectorAll('.movie-card').forEach(card => {
            const add = card.querySelector('.btn-add-list');
            if (add) {
                const titleEl = card.querySelector('.movie-title');
                const meta = card.querySelector('.movie-meta');
                const imgEl = card.querySelector('.movie-image img');
                add.dataset.title = titleEl ? titleEl.textContent.trim() : '';
                add.dataset.year = meta ? meta.textContent.replace('Year:','').trim() : '';
                add.dataset.image = imgEl ? (imgEl.src || '') : '';
                const watch = card.querySelector('.btn-watch');
                add.dataset.link = watch ? (watch.getAttribute('href') || '#') : '#';
            }
        });

    } catch (err) {
        console.error('Fetch/render error:', err);
        const container = document.getElementById('movieCards') || document.getElementById('movie-container');
        if (container) container.innerHTML = '<div class="alert alert-danger">Failed to load movies. See console.</div>';
    } finally {
        window.castTitlesData = data;
        window.getCastTitles = () => {
            const d = window.castTitlesData;
            return Array.isArray(d) ? d : (d && (d.array || d.items || d.results || d.titles)) || [];
        };
    }
})();

function makeCardHTML({ image, title, year, description, link }) {
    return `
    <div class="movie-card" role="article">
        <div class="movie-image">
            <img src="${image || 'images/placeholder.jpg'}" alt="${(title||'Movie')}" loading="lazy" />
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${title || 'Untitled'}</h3>
            <div class="movie-meta">${year ? `Year: ${year}` : ''}</div>
            <p class="movie-desc">${description ? (description.length > 200 ? description.slice(0,197) + '...' : description) : ''}</p>
            <div class="movie-actions">
                <button class="btn-small btn-add-list" data-title="${title}">Add List</button>
                <a class="btn-small btn-watch" href="${link || '#'}" target="_blank" rel="noopener">Watch</a>
            </div>
        </div>
    </div>`;
}