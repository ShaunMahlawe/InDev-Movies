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
    constructor(image, year, title, duration, rating, link){
        this.image = image;
        this.year = title;
        this.duration = duration;
        this.rating = rating;
        this.link = link;
    }
}

function isHighlyRated(movie){
    return parseInt(movie.rating) >= 9;
}

!async function(){
const url = 'https://imdb236.p.rapidapi.com/api/imdb/top-box-office';
const options = {
	method: 'GET',
	headers: {
		'x-rapidapi-key': 'ecdd572f6fmsh055b23482742d2cp1af123jsn9b1d66941f6f',
		'x-rapidapi-host': 'imdb236.p.rapidapi.com'
	}
};

    let data = await fetch(url, options)
                    .then((response)=> response.json())
                    .then((result)=>{return result})
                    .catch((error)=> console.log(error));
    
    console.log(data);

    let movieList = [];

    for(i = 0; i < data.movies.length; i++){

        let image = data.movies[i].image;
        let title = data.movies[i].title;
        let year = data.movies[i].year;
        let rating = data.movies[i].imdbRating;
        let duration = data.movies[i].timeline;
        let link = data.movies[i].link;

        movieList.push(window["movie_" + i] = new Movie(image, year, title, duration, rating, link));

    }

    console.log(movieList);

    let bestMovies = movieList.filter(isHighlyRated);

    console.log(bestMovies);

    bestMovies.forEach(movie => {
        document.getElementById('movie-card').innerHTML += ` <div class="col-md-3">
        <div class="movie-card">
        <img src="${movie.image}" class="card-img-top" alt="...">
        <div class="card-body">
        <h5 class="card-title">${movie.title}</h5>
        <p class="card-text">IMDB rating is ${movie.rating}</p>
        <a href="#" class="btn btn-primary">Go somewhere</a>
        </div>
        </div>
        </div>
        
        `
    });

}();