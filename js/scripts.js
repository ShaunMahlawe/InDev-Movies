let currentIndex = 0;

function moveCarousel(direction) {
    const items = document.querySelectorAll('.carousel-item');

    console.log (`Current index before move: ${currentIndex}`);
    items[currentIndex].classList.remove('active');

    currentIndex += direction;

    if (currentIndex < 0) {
        currentIndex = items.length - 1;
        console.log ('Moved to last item');
    } else if (currentIndex >= items.length) {
        currentIndex = 0;
        console.log ('Moved to first item');
    }

    items[currentIndex].classList.add('active');
    console.log(`Current index after move: ${currentIndex}`);

    const carouselContainer = document.querySelector('.carousel-inner');
    const offset = -currentIndex * 100;
    carouselContainer.style.transform = `translateX(${offset}%)`;
    console.log(`Carousel translated to: ${offset}%`);

    updateVideos();
}

document.querySelector('.carousel-control-prev').addEventListener('click', () => {
    console.log('Previous button clicked');
    moveCarousel(-1);
});

document.querySelector('.carousel-control-next').addEventListener('click', () => {
    console.log ('Next button clicked');
    moveCarousel(1);
});

document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.getElementById('heroCarousel');
    if (!carousel) return;

    const videos = Array.from(carousel.querySelectorAll('video'));
    console.log (`Found ${videos.length} videos in the carousel`);

    videos.forEach(v => {
        v.muted = true;
        console.log ('Video muted on load');
    });

    function updateVideos() {
        videos.forEach(v => {
            const item = v.closest('.carousel-item');
            const isActive = item && item.classList.contains('active');
            if (isActive) {
                v.muted = false;
                console.log('Unmuting active video');
                v.play().catch(() => {
                    v.muted = true;
                    console.log('Failed to play video, muting again');
                });
            } else {
                v.muted = true;
                v.pause();
                console.log('Muting non-active video');
            }
        });
    }

    updateVideos();

    carousel.addEventListener('data-bs-slide-to', () => {
        console.log ('Carousel slide event triggered');
        updateVideos();
    });

    document.addEventListener('click', function once() {
        const activeVideo = carousel.querySelector('.carousel-item.active video');
        if (activeVideo) {
            activeVideo.muted = false;
            console.log ('Playing active video on click');
            activeVideo.play().catch(() => {
                console.log('Error playing video on click');
            });
        }
        document.removeEventListener('click', once);
    });
});
