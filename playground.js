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
    var loopAnchor = 0;
    var isAdjusting = false;
    var scrollNormalizeTimer = null;

    var finePointerQuery = window.matchMedia('(pointer: fine)');

    function usesMouseDrag() {
        return finePointerQuery.matches;
    }

    function getOriginalCards() {
        return Array.from(track.querySelectorAll('.playground-card:not([data-loop-clone])'));
    }

    function cloneCardsForLoop() {
        var cards = getOriginalCards();

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
        var originals = getOriginalCards();
        if (!originals.length) {
            loopWidth = 0;
            loopAnchor = 0;
            return;
        }

        var first = originals[0];
        var last = originals[originals.length - 1];
        var gap = parseFloat(getComputedStyle(track).gap) || 0;

        loopAnchor = first.offsetLeft;
        loopWidth = last.offsetLeft + last.offsetWidth - first.offsetLeft + gap;
    }

    function maxScrollLeft() {
        return Math.max(0, track.scrollWidth - viewport.clientWidth);
    }

    function normalizeScroll() {
        if (!loopWidth || isAdjusting) {
            return;
        }

        isAdjusting = true;

        for (var guard = 0; guard < 6; guard += 1) {
            var left = viewport.scrollLeft;
            var changed = false;
            var maxScroll = maxScrollLeft();
            var appendThreshold = loopAnchor + loopWidth * 2 - viewport.clientWidth - 40;

            if (left < loopWidth * 0.4) {
                viewport.scrollLeft = left + loopWidth;
                if (isDragging) {
                    scrollStart += loopWidth;
                }
                changed = true;
            } else if (left >= maxScroll - 1 && maxScroll > 0) {
                viewport.scrollLeft = left - loopWidth;
                if (isDragging) {
                    scrollStart -= loopWidth;
                }
                changed = true;
            } else if (left > appendThreshold) {
                viewport.scrollLeft = left - loopWidth;
                if (isDragging) {
                    scrollStart -= loopWidth;
                }
                changed = true;
            }

            if (!changed) {
                break;
            }
        }

        isAdjusting = false;
    }

    function scheduleNormalizeScroll() {
        clearTimeout(scrollNormalizeTimer);
        scrollNormalizeTimer = setTimeout(normalizeScroll, 80);
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
            viewport.scrollLeft = loopAnchor;
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
            var offset = loopWidth ? viewport.scrollLeft - loopAnchor : 0;
            initScrollPosition();
            if (loopWidth) {
                viewport.scrollLeft = loopAnchor + offset;
                normalizeScroll();
            }
        });
    });

    window.addEventListener('resize', function () {
        var offset = loopWidth ? viewport.scrollLeft - loopAnchor : 0;
        initScrollPosition();
        if (loopWidth) {
            viewport.scrollLeft = loopAnchor + offset;
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

    function moveDrag(clientX) {
        if (!isDragging) {
            return;
        }
        var walk = clientX - startX;
        dragDistance = Math.max(dragDistance, Math.abs(walk));
        viewport.scrollLeft = scrollStart - walk;
        normalizeScroll();
    }

    function endDrag() {
        if (!isDragging) {
            return;
        }
        isDragging = false;
        viewport.classList.remove('is-dragging');
        normalizeScroll();
    }

    viewport.addEventListener(
        'scroll',
        function () {
            if (isAdjusting) {
                return;
            }
            scheduleNormalizeScroll();
        },
        { passive: true }
    );

    viewport.addEventListener(
        'wheel',
        function (event) {
            if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
                return;
            }
            viewport.scrollLeft += event.deltaX;
            event.preventDefault();
            normalizeScroll();
        },
        { passive: false }
    );

    if (usesMouseDrag()) {
        viewport.addEventListener('mousedown', function (event) {
            if (event.button !== 0) {
                return;
            }
            startDrag(event.pageX);
        });

        window.addEventListener('mouseup', endDrag);

        viewport.addEventListener('mouseleave', endDrag);

        viewport.addEventListener('mousemove', function (event) {
            if (!isDragging) {
                return;
            }
            event.preventDefault();
            moveDrag(event.pageX);
        });
    }

    finePointerQuery.addEventListener('change', function () {
        if (!usesMouseDrag() && isDragging) {
            endDrag();
        }
    });
})();
