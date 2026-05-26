(function () {
    var viewport = document.getElementById('playgroundViewport');
    var track = document.getElementById('playgroundTrack');
    if (!viewport || !track) {
        return;
    }

    var isDragging = false;
    var startX = 0;
    var scrollStart = 0;
    var dragDistance = 0;
    var loopWidth = 0;
    var isAdjusting = false;
    var scrollNormalizeTimer = null;

    var nativeScrollQuery = window.matchMedia('(max-width: 768px), (pointer: coarse)');

    function prefersNativeScroll() {
        return nativeScrollQuery.matches;
    }

    function cloneCardsForLoop() {
        var cards = Array.from(track.querySelectorAll('.playground-card:not([data-loop-clone])'));

        cards.slice().reverse().forEach(function (card) {
            var pre = card.cloneNode(true);
            pre.setAttribute('data-loop-clone', 'prepend');
            pre.setAttribute('aria-hidden', 'true');
            pre.setAttribute('tabindex', '-1');
            pre.removeAttribute('role');
            track.insertBefore(pre, track.firstChild);
        });

        cards.forEach(function (card) {
            var post = card.cloneNode(true);
            post.setAttribute('data-loop-clone', 'append');
            post.setAttribute('aria-hidden', 'true');
            post.setAttribute('tabindex', '-1');
            post.removeAttribute('role');
            track.appendChild(post);
        });
    }

    function measureLoop() {
        loopWidth = track.scrollWidth / 3;
    }

    function maxScrollLeft() {
        return Math.max(0, track.scrollWidth - viewport.clientWidth);
    }

    function normalizeScroll() {
        if (!loopWidth || isAdjusting) {
            return;
        }

        var left = viewport.scrollLeft;
        var maxScroll = maxScrollLeft();
        var changed = false;

        isAdjusting = true;

        while (loopWidth > 0) {
            left = viewport.scrollLeft;
            changed = false;

            if (left < loopWidth * 0.5) {
                viewport.scrollLeft = left + loopWidth;
                changed = true;
            } else if (left >= 2 * loopWidth - 1 || (maxScroll > 0 && left >= maxScroll - 1)) {
                viewport.scrollLeft = left - loopWidth;
                changed = true;
            }

            if (!changed) {
                break;
            }

            maxScroll = maxScrollLeft();
        }

        if (isDragging) {
            scrollStart = viewport.scrollLeft;
        }

        isAdjusting = false;
    }

    function scheduleNormalizeScroll() {
        clearTimeout(scrollNormalizeTimer);
        scrollNormalizeTimer = setTimeout(normalizeScroll, prefersNativeScroll() ? 120 : 0);
    }

    function bindCardLinks(scope) {
        scope.querySelectorAll('.playground-card[data-href]').forEach(function (card) {
            if (card.getAttribute('data-loop-clone')) {
                return;
            }

            card.addEventListener('click', function () {
                if (dragDistance > 8) {
                    return;
                }
                window.location.href = card.getAttribute('data-href');
            });

            card.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    window.location.href = card.getAttribute('data-href');
                }
            });
        });
    }

    function initScrollPosition() {
        measureLoop();
        if (loopWidth) {
            viewport.scrollLeft = loopWidth;
        }
    }

    cloneCardsForLoop();
    bindCardLinks(track);

    requestAnimationFrame(initScrollPosition);

    track.querySelectorAll('img').forEach(function (img) {
        if (img.complete) {
            return;
        }
        img.addEventListener('load', function () {
            var offset = loopWidth ? viewport.scrollLeft - loopWidth : 0;
            initScrollPosition();
            if (loopWidth) {
                viewport.scrollLeft = loopWidth + offset;
                normalizeScroll();
            }
        });
    });

    window.addEventListener('resize', function () {
        var offset = loopWidth ? viewport.scrollLeft - loopWidth : 0;
        initScrollPosition();
        if (loopWidth) {
            viewport.scrollLeft = loopWidth + offset;
            normalizeScroll();
        }
    });

    function startDrag(clientX) {
        isDragging = true;
        dragDistance = 0;
        viewport.classList.add('is-dragging');
        startX = clientX;
        scrollStart = viewport.scrollLeft;
    }

    function moveDrag(clientX, preventDefault) {
        if (!isDragging) {
            return;
        }
        if (preventDefault) {
            preventDefault();
        }
        var walk = clientX - startX;
        dragDistance = Math.max(dragDistance, Math.abs(walk));
        viewport.scrollLeft = scrollStart - walk;
    }

    function endDrag() {
        if (!isDragging) {
            return;
        }
        isDragging = false;
        viewport.classList.remove('is-dragging');
        normalizeScroll();
    }

    viewport.addEventListener('scroll', function () {
        if (isDragging) {
            return;
        }
        scheduleNormalizeScroll();
    }, { passive: true });

    if (!prefersNativeScroll()) {
        viewport.addEventListener('mousedown', function (event) {
            startDrag(event.pageX);
        });

        window.addEventListener('mouseup', endDrag);

        viewport.addEventListener('mouseleave', endDrag);

        viewport.addEventListener('mousemove', function (event) {
            moveDrag(event.pageX, function () {
                event.preventDefault();
            });
        });

        viewport.addEventListener(
            'touchstart',
            function (event) {
                if (event.touches.length !== 1) {
                    return;
                }
                startDrag(event.touches[0].pageX);
            },
            { passive: true }
        );

        viewport.addEventListener(
            'touchmove',
            function (event) {
                if (event.touches.length !== 1) {
                    return;
                }
                moveDrag(event.touches[0].pageX, function () {
                    event.preventDefault();
                });
            },
            { passive: false }
        );

        viewport.addEventListener('touchend', endDrag);
        viewport.addEventListener('touchcancel', endDrag);

        viewport.addEventListener(
            'wheel',
            function (event) {
                if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) {
                    viewport.scrollLeft += event.deltaY;
                } else {
                    viewport.scrollLeft += event.deltaX;
                }
                event.preventDefault();
                scheduleNormalizeScroll();
            },
            { passive: false }
        );
    }
})();
