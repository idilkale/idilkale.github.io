(function () {
    document.querySelectorAll('.cs-reveal').forEach(function (el, i) {
        el.style.transitionDelay = (i % 5) * 0.06 + 's';
    });

    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('cs-reveal-visible');
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.cs-reveal').forEach(function (el) {
        revealObserver.observe(el);
    });

    /* Side nav — Works case studies (section tags) */
    if (!document.body.classList.contains('case-study-page')) {
        return;
    }
    if (document.body.classList.contains('playground-project-minimal')) {
        return;
    }

    var main = document.querySelector('.case-study-main');
    if (!main) {
        return;
    }

    var eyebrows = Array.prototype.filter.call(
        document.querySelectorAll('.case-study-main .cs-eyebrow'),
        function (el) {
            if (el.closest('.cs-hero')) {
                return false;
            }
            if (el.closest('.cs-reflection')) {
                return false;
            }
            /* Nested sub-blocks (e.g. flipbook under Brand System) — not separate nav items */
            if (el.closest('.armoni-flipbook-section, .armoni-brochure-section')) {
                return false;
            }
            return true;
        }
    );

    if (eyebrows.length < 2) {
        return;
    }

    function slugify(text) {
        return text
            .trim()
            .toLowerCase()
            .replace(/&amp;/g, 'and')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    var sections = [];

    eyebrows.forEach(function (eyebrow) {
        var target =
            eyebrow.closest('.unisphere-section') ||
            eyebrow.closest('.cs-section') ||
            eyebrow.closest('.armoni-flipbook-section') ||
            eyebrow.closest('.armoni-brochure-section');

        if (!target) {
            return;
        }

        var label = eyebrow.textContent.trim();
        var base = slugify(label);
        var id = base;
        var n = 2;
        while (document.getElementById(id)) {
            id = base + '-' + n;
            n += 1;
        }

        target.id = id;
        if (!target.hasAttribute('tabindex')) {
            target.setAttribute('tabindex', '-1');
        }

        sections.push({ id: id, label: label });
    });

    if (sections.length < 2) {
        return;
    }

    var nav = document.createElement('nav');
    nav.className = 'cs-side-nav';
    nav.setAttribute('aria-label', 'Case study');

    var backLink = document.createElement('a');
    backLink.className = 'cs-side-nav-back';
    backLink.href = 'works.html';
    backLink.textContent = '← Back to Works';
    nav.appendChild(backLink);

    var title = document.createElement('p');
    title.className = 'cs-side-nav-title';
    title.textContent = 'On this page';
    nav.appendChild(title);

    var list = document.createElement('ul');
    list.className = 'cs-side-nav-list';

    sections.forEach(function (section, index) {
        var li = document.createElement('li');
        var link = document.createElement('a');
        link.href = '#' + section.id;
        link.textContent = section.label;
        if (index === 0) {
            link.classList.add('is-active');
        }
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var el = document.getElementById(section.id);
            if (!el) {
                return;
            }
            var top = el.getBoundingClientRect().top + window.pageYOffset - getScrollOffset();
            window.scrollTo({ top: top, behavior: 'smooth' });
            history.replaceState(null, '', '#' + section.id);
            setActive(link);
        });
        li.appendChild(link);
        list.appendChild(li);
    });

    nav.appendChild(list);
    document.body.appendChild(nav);
    document.body.classList.add('has-cs-side-nav');

    function getScrollOffset() {
        return document.body.classList.contains('case-study-scrolled') ? 24 : 80;
    }

    function setActive(activeLink) {
        nav.querySelectorAll('.cs-side-nav-list a').forEach(function (a) {
            a.classList.toggle('is-active', a === activeLink);
        });
    }

    var scrollThreshold = 80;

    function updateCaseStudyChrome() {
        document.body.classList.toggle('case-study-scrolled', window.scrollY > scrollThreshold);
    }

    window.addEventListener('scroll', updateCaseStudyChrome, { passive: true });
    updateCaseStudyChrome();

    var sectionEls = sections
        .map(function (s) {
            return document.getElementById(s.id);
        })
        .filter(Boolean);

    if (sectionEls.length && 'IntersectionObserver' in window) {
        var navObserver = new IntersectionObserver(
            function (entries) {
                var visible = entries
                    .filter(function (e) {
                        return e.isIntersecting;
                    })
                    .sort(function (a, b) {
                        return a.boundingClientRect.top - b.boundingClientRect.top;
                    });

                if (!visible.length) {
                    return;
                }

                var id = visible[0].target.id;
                var active = nav.querySelector('a[href="#' + id + '"]');
                if (active) {
                    setActive(active);
                }
            },
            { rootMargin: '-20% 0px -55% 0px', threshold: 0 }
        );

        sectionEls.forEach(function (el) {
            navObserver.observe(el);
        });
    }
})();
