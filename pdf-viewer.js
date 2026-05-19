/**
 * Hi-DPI PDF.js canvas rendering for portfolio case studies.
 */
(function (global) {
    const PIXEL_RATIO_CAP = 2;

    function renderPdfPage(page, canvas, stage) {
        const ctx = canvas.getContext('2d');
        const pixelRatio = Math.min(global.devicePixelRatio || 1, PIXEL_RATIO_CAP);
        const unscaled = page.getViewport({ scale: 1 });
        const maxWidth = Math.max(320, stage.clientWidth - 24);
        const displayScale = maxWidth / unscaled.width;
        const renderViewport = page.getViewport({ scale: displayScale * pixelRatio });
        const displayViewport = page.getViewport({ scale: displayScale });

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(displayViewport.width)}px`;
        canvas.style.height = `${Math.floor(displayViewport.height)}px`;

        return page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
    }

    function initHiDpiPdfViewer(config) {
        const {
            canvas,
            stage,
            prevBtn,
            nextBtn,
            pageInfo,
            pdfPath,
            slideClassPrefix = 'signature-slide',
            loop = false
        } = config;

        if (!canvas || !stage || !prevBtn || !nextBtn || !pageInfo || !pdfPath || !global.pdfjsLib) {
            return;
        }

        const ctx = canvas.getContext('2d');
        let pdfDoc = null;
        let currentPage = 1;
        let isRendering = false;
        let pendingPage = null;
        let directionClass = `${slideClassPrefix}-right`;

        function updateButtons() {
            if (loop && pdfDoc) {
                prevBtn.disabled = false;
                nextBtn.disabled = false;
            } else {
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = !pdfDoc || currentPage >= pdfDoc.numPages;
            }
            pageInfo.textContent = pdfDoc
                ? `Page ${currentPage} / ${pdfDoc.numPages}`
                : 'Loading...';
        }

        function queueRender(pageNum, slideClass) {
            if (isRendering) {
                pendingPage = { pageNum, slideClass };
                return;
            }
            renderPage(pageNum, slideClass);
        }

        function renderPage(pageNum, slideClass) {
            isRendering = true;
            directionClass = slideClass || directionClass;

            pdfDoc.getPage(pageNum).then((page) => {
                canvas.classList.remove(`${slideClassPrefix}-left`, `${slideClassPrefix}-right`);
                canvas.classList.add(directionClass);
                return renderPdfPage(page, canvas, stage);
            }).then(() => {
                isRendering = false;
                if (pendingPage) {
                    const next = pendingPage;
                    pendingPage = null;
                    renderPage(next.pageNum, next.slideClass);
                    return;
                }
                updateButtons();
            }).catch(() => {
                isRendering = false;
                pageInfo.textContent = 'PDF could not be loaded.';
            });
        }

        function goToPage(pageNum, slideClass) {
            if (!pdfDoc) return;

            if (loop) {
                if (pageNum < 1) pageNum = pdfDoc.numPages;
                if (pageNum > pdfDoc.numPages) pageNum = 1;
            } else if (pageNum < 1 || pageNum > pdfDoc.numPages) {
                return;
            }

            currentPage = pageNum;
            updateButtons();
            queueRender(currentPage, slideClass);
        }

        prevBtn.addEventListener('click', function (e) {
            e.preventDefault();
            goToPage(currentPage - 1, slideClassPrefix + '-left');
        });

        nextBtn.addEventListener('click', function (e) {
            e.preventDefault();
            goToPage(currentPage + 1, slideClassPrefix + '-right');
        });

        window.addEventListener('resize', () => {
            if (pdfDoc) queueRender(currentPage, directionClass);
        });

        pageInfo.textContent = 'Loading...';
        global.pdfjsLib.getDocument(pdfPath).promise.then((pdf) => {
            pdfDoc = pdf;
            currentPage = 1;
            updateButtons();
            renderPage(currentPage, `${slideClassPrefix}-right`);
        }).catch(() => {
            pageInfo.textContent = 'PDF could not be loaded.';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        });
    }

    global.PdfViewer = {
        renderPdfPage,
        initHiDpiPdfViewer
    };
})(window);
