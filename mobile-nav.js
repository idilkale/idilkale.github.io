(function () {
    var header = document.querySelector('.header');
    if (!header) {
        return;
    }

    var desktopNav = header.querySelector('.header-nav');
    var content = header.querySelector('.header-content');
    if (!desktopNav || !content) {
        return;
    }

    var sourceList = desktopNav.querySelector('ul');
    if (!sourceList) {
        return;
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'header-menu-btn';
    btn.setAttribute('aria-label', 'Open menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'headerMobileNav');
    btn.innerHTML =
        '<span class="header-menu-btn-bars" aria-hidden="true"><span></span><span></span><span></span></span>';

    document.body.classList.add('has-mobile-nav');

    var panel = document.createElement('nav');
    panel.id = 'headerMobileNav';
    panel.className = 'header-mobile-nav';
    panel.setAttribute('aria-label', 'Main');
    panel.setAttribute('aria-hidden', 'true');
    panel.appendChild(sourceList.cloneNode(true));

    var backdrop = document.createElement('div');
    backdrop.className = 'header-mobile-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    content.appendChild(btn);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    function syncHeaderHeight() {
        document.documentElement.style.setProperty(
            '--mobile-header-height',
            header.getBoundingClientRect().height + 'px'
        );
    }

    function setOpen(open) {
        document.body.classList.toggle('mobile-nav-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        panel.classList.toggle('is-open', open);
        backdrop.classList.toggle('is-open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    function closeMenu() {
        setOpen(false);
    }

    btn.addEventListener('click', function (event) {
        event.stopPropagation();
        syncHeaderHeight();
        setOpen(!document.body.classList.contains('mobile-nav-open'));
    });

    backdrop.addEventListener('click', closeMenu);

    panel.querySelectorAll('a[href]').forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            var href = link.getAttribute('href');
            closeMenu();
            if (href) {
                window.location.href = href;
            }
        });
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeMenu();
        }
    });

    function syncNavMode() {
        var mobile = window.innerWidth <= 768;
        desktopNav.setAttribute('aria-hidden', mobile ? 'true' : 'false');
        if (!mobile) {
            closeMenu();
        }
    }

    window.addEventListener('resize', function () {
        syncHeaderHeight();
        syncNavMode();
    });
    window.addEventListener('scroll', syncHeaderHeight, { passive: true });
    syncHeaderHeight();
    syncNavMode();
})();
