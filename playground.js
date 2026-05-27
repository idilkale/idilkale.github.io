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
    var smoothScrollRaf = null;

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

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function smoothScrollBy(delta, duration) {
        if (smoothScrollRaf) {
            cancelAnimationFrame(smoothScrollRaf);
            smoothScrollRaf = null;
        }

        var startLeft = viewport.scrollLeft;
        var targetLeft = startLeft + delta;
        var startTime = null;
        duration = duration || 520;

        function frame(time) {
            if (startTime === null) {
                startTime = time;
            }
            var progress = Math.min((time - startTime) / duration, 1);
            viewport.scrollLeft = startLeft + (targetLeft - startLeft) * easeOutCubic(progress);

            if (progress < 1) {
                smoothScrollRaf = requestAnimationFrame(frame);
                return;
            }

            smoothScrollRaf = null;
            normalizeScroll();
        }

        smoothScrollRaf = requestAnimationFrame(frame);
    }

    function resolveCardFromTarget(target) {
        if (!target || typeof target.closest !== 'function') {
            return null;
        }
        return target.closest('.playground-card[data-href]');
    }

    function bindCardLinks(scope) {
        scope.addEventListener('click', function (event) {
            var card = resolveCardFromTarget(event.target);
            if (!card || dragDistance > 8) {
                return;
            }

            var href = card.getAttribute('data-href');
            if (href) {
                window.location.href = href;
            }
        });

        scope.querySelectorAll('.playground-card[data-href]').forEach(function (card) {
            card.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    var href = card.getAttribute('data-href');
                    if (href) {
                        window.location.href = href;
                    }
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
            var delta = 0;

            if (usesMouseDrag()) {
                if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                    delta = event.deltaX;
                } else if (event.deltaY !== 0) {
                    delta = event.deltaY;
                }
            } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                delta = event.deltaX;
            }

            if (!delta) {
                return;
            }

            event.preventDefault();
            viewport.scrollLeft += delta;
            normalizeScroll();
        },
        { passive: false }
    );

    function handleArrowScroll(event) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return;
        }
        var tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || (event.target && event.target.isContentEditable)) {
            return;
        }

        event.preventDefault();
        var step = Math.max(220, Math.round(viewport.clientWidth * 0.38));
        smoothScrollBy(event.key === 'ArrowRight' ? step : -step, 520);
    }

    viewport.setAttribute('tabindex', '0');
    viewport.addEventListener('keydown', handleArrowScroll);
    document.addEventListener('keydown', handleArrowScroll);

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
