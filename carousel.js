/**
 * Looping image carousel for portfolio case study pages.
 */
(function (global) {
    function initCarousel(config) {
        const track = document.getElementById(config.trackId);
        const prevBtn = document.getElementById(config.prevId);
        const nextBtn = document.getElementById(config.nextId);
        const info = document.getElementById(config.infoId);
        if (!track || !prevBtn || !nextBtn || !info) return;

        const slideSelector = config.slideSelector || '.signature-persona-card';
        const slides = track.querySelectorAll(slideSelector);
        if (!slides.length) return;

        let index = 0;
        const total = slides.length;
        const label = config.label || 'Slide';

        function update() {
            track.style.transform = 'translateX(-' + (index * 100) + '%)';
            info.textContent = label + ' ' + (index + 1) + ' / ' + total;
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        }

        prevBtn.addEventListener('click', function (e) {
            e.preventDefault();
            index = (index - 1 + total) % total;
            update();
        });

        nextBtn.addEventListener('click', function (e) {
            e.preventDefault();
            index = (index + 1) % total;
            update();
        });

        update();
    }

    global.PortfolioCarousel = {
        init: initCarousel
    };
})(window);
