let currentIndex = 0;
let videos = [];

function updateVideos() {
    if (!videos || videos.length === 0) return;
    videos.forEach(v => {
        const item = v.closest('.carousel-item');
        const isActive = item && item.classList.contains('active');
        try {
            if (isActive) {
                v.muted = false;
                v.play().catch(() => { v.muted = true; });
                console.log('Unmuting active video');
            } else {
                v.muted = true;
                v.pause();
                console.log('Muting non-active video');
            }
        } catch (e) {}
    });
}

function moveCarousel(direction) {
    const items = document.querySelectorAll('.carousel-item');
    if (!items || items.length === 0) return;

    console.log(`Current index before move: ${currentIndex}`);
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
    if (!carousel) return;

    videos = Array.from(carousel.querySelectorAll('video'));
    console.log(`Found ${videos.length} videos in the carousel`);

    videos.forEach(v => {
        try { v.muted = true; } catch (e) {}
        console.log('Video muted on load');
    });

    updateVideos();

   carousel.addEventListener('slid.bs.carousel', () => {
        console.log('Carousel slid event triggered');
        updateVideos();
    });

    document.addEventListener('click', function once() {
        const activeVideo = carousel.querySelector('.carousel-item.active video');
        if (activeVideo) {
            try {
                activeVideo.muted = false;
                activeVideo.play().catch(() => {});
                console.log('Playing active video on click');
            } catch (e) {}
        }
        document.removeEventListener('click', once);
    });
});