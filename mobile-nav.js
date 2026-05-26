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
    panel.hidden = true;
    panel.appendChild(sourceList.cloneNode(true));

    var backdrop = document.createElement('div');
    backdrop.className = 'header-mobile-backdrop';
    backdrop.hidden = true;

    content.appendChild(btn);
    header.appendChild(panel);
    document.body.appendChild(backdrop);

    function setOpen(open) {
        document.body.classList.toggle('mobile-nav-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        panel.hidden = !open;
        backdrop.hidden = !open;
    }

    function closeMenu() {
        setOpen(false);
    }

    btn.addEventListener('click', function () {
        setOpen(!document.body.classList.contains('mobile-nav-open'));
    });

    backdrop.addEventListener('click', closeMenu);

    panel.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeMenu);
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

    window.addEventListener('resize', syncNavMode);
    syncNavMode();
})();
