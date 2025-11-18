// Header scroll hide/show functionality
let lastScrollTop = 0;
const header = document.querySelector('.header');
const compactHeader = document.querySelector('.compact-header');
const scrollToTopBtn = document.getElementById('scrollToTop');
const scrollThreshold = 100; // Header'ın kaybolması için gereken scroll mesafesi

if (header) {
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const isAtBottom = scrollTop + windowHeight >= documentHeight - 10; // 10px tolerance

        // Scroll to top butonunu göster/gizle
        if (scrollToTopBtn) {
            if (scrollTop > 300) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        }

        // Header ve compact header kontrolü - sadece scroll pozisyonuna göre
        if (scrollTop <= scrollThreshold) {
            // En üstteyken (threshold altında) normal header'ı göster, compact header'ı gizle
            header.classList.remove('hidden');
            if (compactHeader) {
                compactHeader.classList.remove('visible');
            }
        } else {
            // Threshold üzerindeyken (yukarı scroll olsa bile veya en altta) compact header göster, büyük header gizle
            header.classList.add('hidden');
            if (compactHeader) {
                compactHeader.classList.add('visible');
            }
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });

    // Scroll to top button click handler
    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            // Scroll başladığında normal header'ı göster, compact header'ı gizle
            header.classList.remove('hidden');
            if (compactHeader) {
                compactHeader.classList.remove('visible');
            }
        });
    }
}

