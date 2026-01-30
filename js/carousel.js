function initCarousel() {
    const root = document.querySelector("[data-carousel]");
    if (!root) return;

    const track = root.querySelector("[data-carousel-track]");
    const viewport = root.querySelector(".carousel__viewport");
    const prevBtn = root.querySelector("[data-carousel-prev]");
    const nextBtn = root.querySelector("[data-carousel-next]");
    const dotsWrap = root.querySelector("[data-carousel-dots]");

    if (!track || !viewport) return;

    const TRANSITION = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
    const AUTOPLAY_MS = 5000;

    // Prevent double initialization (e.g., when include script runs twice)
    if (track.querySelector('[data-clone="true"]')) return;

    const realSlides = Array.from(track.children);
    if (realSlides.length <= 1) return;

    // Clone first/last slide for seamless infinite loop
    const firstClone = realSlides[0].cloneNode(true);
    const lastClone = realSlides[realSlides.length - 1].cloneNode(true);
    firstClone.setAttribute("data-clone", "true");
    lastClone.setAttribute("data-clone", "true");

    track.insertBefore(lastClone, realSlides[0]);
    track.appendChild(firstClone);

    const realCount = realSlides.length;

    // Index: 1..realCount (0 = lastClone, realCount+1 = firstClone)
    let index = 1;
    let timerId = null;
    let isAnimating = false;

    function slideWidth() {
        return viewport.clientWidth || 0;
    }

    function setTransition(on) {
        track.style.transition = on ? TRANSITION : "none";
    }

    function applyTransform() {
        track.style.transform = `translateX(-${index * slideWidth()}px)`;
    }

    function updateDots() {
        if (!dotsWrap) return;
        const realIndex = index - 1; // 0..realCount-1
        Array.from(dotsWrap.children).forEach((d, i) =>
            d.classList.toggle("is-active", i === realIndex)
        );
    }

    function renderDots() {
        if (!dotsWrap) return;
        dotsWrap.innerHTML = "";
        for (let i = 0; i < realCount; i++) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "carousel__dot";
            b.setAttribute("aria-label", `Przejdź do slajdu ${i + 1}`);
            b.addEventListener("click", () => goTo(i + 1, true, true));
            dotsWrap.appendChild(b);
        }
        updateDots();
    }

    function stopAutoplay() {
        if (timerId) clearInterval(timerId);
        timerId = null;
    }

    function startAutoplay() {
        stopAutoplay();
        timerId = setInterval(() => goNext(true), AUTOPLAY_MS);
    }

    function restartAutoplay() {
        startAutoplay();
    }

    function goTo(nextIndex, animated, userAction) {
        if (isAnimating) return;
        isAnimating = !!animated;

        if (userAction) restartAutoplay();

        setTransition(!!animated);
        index = nextIndex;
        applyTransform();
        updateDots();

        if (!animated) {
            isAnimating = false;
        }
    }

    function goNext(userAction) {
        goTo(index + 1, true, userAction);
    }

    function goPrev(userAction) {
        goTo(index - 1, true, userAction);
    }

    // Edge fix: after animating to a clone, jump to the matching real slide without animation
    track.addEventListener("transitionend", () => {
        isAnimating = false;

        if (index === 0) {
            setTransition(false);
            index = realCount;
            applyTransform();
            requestAnimationFrame(() => setTransition(true));
        } else if (index === realCount + 1) {
            setTransition(false);
            index = 1;
            applyTransform();
            requestAnimationFrame(() => setTransition(true));
        }

        updateDots();
    });

    // Buttons
    if (prevBtn) prevBtn.addEventListener("click", () => goPrev(true));
    if (nextBtn) nextBtn.addEventListener("click", () => goNext(true));

    // Pause on hover (desktop only)
    const canHover = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
    if (canHover) {
        root.addEventListener("mouseenter", stopAutoplay);
        root.addEventListener("mouseleave", startAutoplay);
    }

    // Resize: keep the same slide visible, without animation
    window.addEventListener("resize", () => {
        setTransition(false);
        applyTransform();
        requestAnimationFrame(() => setTransition(true));
    });

    // Init
    renderDots();
    setTransition(false);
    applyTransform();
    requestAnimationFrame(() => setTransition(true));
    startAutoplay();
}

window.__initCarousel = initCarousel;
