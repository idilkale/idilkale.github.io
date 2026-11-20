(function () {
    document.documentElement.classList.add('js');

    /* Side-project gallery: cards arrive one by one, drag / buttons / keys to scroll */
    var gallery = document.querySelector('[data-gallery]');
    if (gallery) {
        var cards = gallery.querySelectorAll('.gcard');
        cards.forEach(function (c, n) { c.style.setProperty('--i', n); });

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) { gallery.classList.add('is-in'); io.disconnect(); }
                });
            }, { threshold: 0.2 });
            io.observe(gallery);
        } else {
            gallery.classList.add('is-in');
        }

        var btns = document.querySelectorAll('.gallery-btn');
        var step = function () { return Math.max(300, gallery.clientWidth * 0.7); };
        var syncBtns = function () {
            var max = gallery.scrollWidth - gallery.clientWidth - 2;
            btns.forEach(function (b) {
                b.disabled = b.dataset.dir === '-1' ? gallery.scrollLeft <= 2 : gallery.scrollLeft >= max;
            });
        };
        btns.forEach(function (b) {
            b.addEventListener('click', function () {
                gallery.scrollBy({ left: step() * Number(b.dataset.dir), behavior: 'smooth' });
            });
        });
        gallery.addEventListener('scroll', syncBtns, { passive: true });
        window.addEventListener('resize', syncBtns);
        syncBtns();

        gallery.addEventListener('keydown', function (e) {
            if (e.target !== gallery) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                gallery.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * step(), behavior: 'smooth' });
            }
        });

        /* mouse drag (touch already scrolls natively) */
        var down = false, moved = false, startX = 0, startLeft = 0;
        gallery.addEventListener('pointerdown', function (e) {
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            down = true; moved = false; startX = e.clientX; startLeft = gallery.scrollLeft;
        });
        window.addEventListener('pointermove', function (e) {
            if (!down) return;
            var dx = e.clientX - startX;
            if (!moved && Math.abs(dx) > 6) { moved = true; gallery.classList.add('is-dragging'); }
            if (moved) gallery.scrollLeft = startLeft - dx;
        });
        window.addEventListener('pointerup', function () {
            if (!down) return;
            down = false;
            setTimeout(function () { gallery.classList.remove('is-dragging'); }, 0);
        });
        gallery.addEventListener('click', function (e) {
            if (moved) { e.preventDefault(); moved = false; }
        }, true);
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
