(function () {
    document.documentElement.classList.add('js');

    /* Side-project gallery: an endless strip that drifts left to right.
       The cards are cloned on both sides and the position wraps by one set,
       so auto-drift, drag, buttons, keys and touch all share one loop. */
    var gallery = document.querySelector('[data-gallery]');
    if (gallery) {
        var originals = Array.prototype.slice.call(gallery.querySelectorAll('.gcard'));
        var makeClone = function (card) {
            var c = card.cloneNode(true);
            c.setAttribute('aria-hidden', 'true');
            c.setAttribute('tabindex', '-1');
            c.classList.add('is-clone');
            return c;
        };
        var first = originals[0];
        originals.forEach(function (card) { gallery.insertBefore(makeClone(card), first); });
        originals.forEach(function (card) { gallery.appendChild(makeClone(card)); });
        gallery.querySelectorAll('.gcard').forEach(function (c, n) {
            c.style.setProperty('--i', Math.abs(n - originals.length));
        });

        var setWidth = 0, pos = 0, lastSet = null;
        var measure = function () {
            var oldSet = setWidth;
            setWidth = gallery.querySelectorAll('.gcard')[originals.length * 2].offsetLeft - first.offsetLeft;
            if (!oldSet) pos = first.offsetLeft - parseFloat(getComputedStyle(gallery).paddingLeft);
            else pos = pos * setWidth / oldSet;
            apply();
        };
        var wrap = function () {
            if (!setWidth) return;
            var start = first.offsetLeft - parseFloat(getComputedStyle(gallery).paddingLeft);
            while (pos < start - setWidth / 2) pos += setWidth;
            while (pos > start + setWidth / 2) pos -= setWidth;
        };
        var applying = false;
        var apply = function () { wrap(); applying = true; gallery.scrollLeft = pos; };

        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var SPEED = 38;                 /* px per second; negative direction = content moves right */
        var paused = false, inView = false, tween = null, last = 0;

        var tick = function (t) {
            var dt = last ? Math.min(t - last, 64) / 1000 : 0;
            last = t;
            if (tween) {
                var k = Math.min((t - tween.t0) / 520, 1);
                var e = 1 - Math.pow(1 - k, 3);
                pos = tween.from + (tween.to - tween.from) * e;
                if (k >= 1) tween = null;
                apply();
            } else if (!paused && inView && !reduce && !down) {
                pos -= SPEED * dt;
                apply();
            }
            requestAnimationFrame(tick);
        };

        /* entrance (cards arrive one by one) + only drift while visible */
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    inView = en.isIntersecting;
                    if (en.isIntersecting) gallery.classList.add('is-in');
                });
            }, { threshold: 0.15 }).observe(gallery);
        } else { gallery.classList.add('is-in'); inView = true; }

        /* pause while the visitor is looking or interacting */
        var resumeTimer = null;
        var pause = function () { paused = true; clearTimeout(resumeTimer); };
        var resumeSoon = function (ms) { clearTimeout(resumeTimer); resumeTimer = setTimeout(function () { paused = false; }, ms || 0); };
        gallery.addEventListener('mouseenter', pause);
        gallery.addEventListener('mouseleave', function () { resumeSoon(300); });
        gallery.addEventListener('focusin', pause);
        gallery.addEventListener('focusout', function () { resumeSoon(1500); });
        gallery.addEventListener('touchstart', pause, { passive: true });
        gallery.addEventListener('touchend', function () { resumeSoon(2500); }, { passive: true });

        /* native scrolling (touch / trackpad) feeds back into the loop */
        gallery.addEventListener('scroll', function () {
            if (applying) { applying = false; return; }
            pos = gallery.scrollLeft;
            if (!tween) { wrap(); if (Math.abs(gallery.scrollLeft - pos) > 1) { applying = true; gallery.scrollLeft = pos; } }
        }, { passive: true });

        var step = function () { return Math.max(300, gallery.clientWidth * 0.7); };
        var nudge = function (dir) {
            pause(); resumeSoon(2500);
            tween = { from: pos, to: pos + dir * step(), t0: performance.now() };
        };
        document.querySelectorAll('.gallery-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { nudge(Number(btn.dataset.dir)); });
        });
        gallery.addEventListener('keydown', function (e) {
            if (e.target !== gallery) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); nudge(e.key === 'ArrowRight' ? 1 : -1); }
        });

        /* mouse drag */
        var down = false, moved = false, startX = 0, startPos = 0;
        gallery.addEventListener('pointerdown', function (e) {
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            down = true; moved = false; startX = e.clientX; startPos = pos; tween = null;
        });
        window.addEventListener('pointermove', function (e) {
            if (!down) return;
            var dx = e.clientX - startX;
            if (!moved && Math.abs(dx) > 6) { moved = true; gallery.classList.add('is-dragging'); }
            if (moved) { pos = startPos - dx; apply(); if (Math.abs(pos - (startPos - dx)) > 1) { startPos = pos + dx; } }
        });
        window.addEventListener('pointerup', function () {
            if (!down) return;
            down = false;
            setTimeout(function () { gallery.classList.remove('is-dragging'); }, 0);
        });
        gallery.addEventListener('click', function (e) {
            if (moved) { e.preventDefault(); moved = false; }
        }, true);

        window.addEventListener('resize', measure);
        window.addEventListener('load', measure);
        measure();
        requestAnimationFrame(tick);
    }

    /* Switchable tabs (Essential skills) */
    document.querySelectorAll('[data-tabs]').forEach(function (list) {
        var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
        var select = function (tab, focus) {
            tabs.forEach(function (t) {
                var on = t === tab;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.tabIndex = on ? 0 : -1;
                document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
            });
            if (focus) tab.focus();
        };
        tabs.forEach(function (t, i) {
            t.addEventListener('click', function () { select(t); });
            t.addEventListener('keydown', function (e) {
                var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
                if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
                else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
                else if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
            });
        });
    });

    /* Back to top */
    var toTop = document.getElementById('toTop');
    if (toTop) {
        var onScroll = function () { toTop.classList.toggle('is-on', window.pageYOffset > window.innerHeight * 0.8); };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* "People describe me as.." carousel (home): every trait is in the HTML,
       stacked in one grid cell, so the band keeps the height of the longest one */
    var stack = document.getElementById('traitStack');
    if (stack) {
        var items = stack.querySelectorAll('.trait');
        var countEl = document.getElementById('traitCount');
        var i = 0;
        var show = function (n) {
            i = (n + items.length) % items.length;
            items.forEach(function (el, k) {
                el.classList.toggle('is-on', k === i);
                if (k === i) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
            });
            countEl.textContent = '0' + (i + 1) + ' / 0' + items.length;
        };
        document.getElementById('traitPrev').addEventListener('click', function () { show(i - 1); });
        document.getElementById('traitNext').addEventListener('click', function () { show(i + 1); });
    }
})();
