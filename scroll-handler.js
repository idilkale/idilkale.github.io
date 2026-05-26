// Scroll-to-top button visibility
const scrollToTopBtn = document.getElementById('scrollToTop');

function updateScrollUi() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollToTopBtn) {
        if (scrollTop > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }
}

window.addEventListener('scroll', updateScrollUi, { passive: true });
updateScrollUi();

if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}
