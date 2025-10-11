let currentIndex = 0;

function moveCarousel(direction) {
    const items = document.querySelectorAll('.carousel-item');

    items[currentIndex].classList.remove('active');

    currentIndex += direction;

    if (currentIndex < 0) {
        currentIndex = items.length - 1;
    } else if (currentIndex >= items.length) {
        currentIndex = 0;
    }

    items[currentIndex].classList.add('active');

    const carouselContainer = document.querySelector('.carousel-inner');
    const offset = -currentIndex * 100;
    carouselContainer.style.transform = `translateX(${offset}%)`;

    updateVideos();
}

document.querySelector('.carousel-control-prev').addEventListener('click', () => moveCarousel(-1));
document.querySelector('.carousel-control-next').addEventListener('click', () => moveCarousel(1));

document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.getElementById('heroCarousel');
    if (!carousel) return;

    const videos = Array.from(carousel.querySelectorAll('video'));

    videos.forEach(v => {
        v.muted = true;
    });

    function updateVideos() {
        videos.forEach(v => {
            const item = v.closest('.carousel-item');
            const isActive = item && item.classList.contains('active');
            if (isActive) {
                v.muted = false;
                v.play().catch(() => {
                    v.muted = true;
                });
            } else {
                v.muted = true;
                v.pause(); 
            }
        });
    }

    updateVideos();

    carousel.addEventListener('slid.bs.carousel', () => {
        updateVideos();
    });

    document.addEventListener('click', function once() {
        const activeVideo = carousel.querySelector('.carousel-item.active video');
        if (activeVideo) {
            activeVideo.muted = false;
            activeVideo.play().catch(() => {});
        }
        document.removeEventListener('click', once);
    });
});
