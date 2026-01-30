function initCarousel() {
    const root = document.querySelector("[data-carousel]");
    if (!root) return;
  
    const track = root.querySelector("[data-carousel-track]");
    const viewport = root.querySelector(".carousel__viewport");
    const prevBtn = root.querySelector("[data-carousel-prev]");
    const nextBtn = root.querySelector("[data-carousel-next]");
    const dotsWrap = root.querySelector("[data-carousel-dots]");

    function snapOn() { track.classList.add("is-snapping"); }
function snapOff() { track.classList.remove("is-snapping"); }
  
    if (!track || !viewport) return;
  
    // --- Setup slides + clones ---
    let realSlides = Array.from(track.children);
    if (realSlides.length <= 1) return;
  
    // Czy już zrobione (gdyby init odpalił 2x)
    if (track.querySelector('[data-clone="true"]')) return;
  
    const firstClone = realSlides[0].cloneNode(true);
    const lastClone = realSlides[realSlides.length - 1].cloneNode(true);
    firstClone.setAttribute("data-clone", "true");
    lastClone.setAttribute("data-clone", "true");
  
    track.insertBefore(lastClone, realSlides[0]);
    track.appendChild(firstClone);
  
    const slidesAll = Array.from(track.children); // [lastClone, ...real, firstClone]
    const realCount = realSlides.length;
  
    // index: 1..realCount (0=lastClone, realCount+1=firstClone)
    let index = 1;
    let timerId = null;
    let isAnimating = false;
  
    const AUTOPLAY_MS = 15000;
    const TRANSITION = "transform 320ms ease";

    function goNext() {
        if (isAnimating) return;
        isAnimating = true;
        index += 1;
        apply(); // CSS zrobi transition
      }
      
      function goPrev() {
        if (isAnimating) return;
        isAnimating = true;
        index -= 1;
        apply();
      }      
  
    function w() {
      return viewport.clientWidth || 0;
    }
  
    function setTransition(on) {
      track.style.transition = on ? TRANSITION : "none";
    }
  
    function apply() {
      track.style.transform = `translateX(-${index * w()}px)`;
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
        b.addEventListener("click", () => {
          if (isAnimating) return;
          index = i + 1;
          setTransition(true);
          apply();
          updateDots();
          restartAutoplay();
        });
        dotsWrap.appendChild(b);
      }
      updateDots();
    }
  
    function goNext(animated) {
      if (isAnimating) return;
      isAnimating = animated;
      setTransition(animated);
      index += 1;
      apply();
    }
  
    function goPrev(animated) {
      if (isAnimating) return;
      isAnimating = animated;
      setTransition(animated);
      index -= 1;
      apply();
    }
  
    track.addEventListener("transitionend", () => {
        isAnimating = false;
      
        if (index === 0) {
          // jesteś na lastClone -> przeskocz na prawdziwy ostatni
          snapOn();
          index = realCount;
          apply();
          track.offsetHeight;
          snapOff();
        } else if (index === realCount + 1) {
          // jesteś na firstClone -> przeskocz na prawdziwy pierwszy
          snapOn();
          index = 1;
          apply();
          track.offsetHeight;
          snapOff();
        }
      
        updateDots();
      });
      
  
    // Buttons
    if (prevBtn) prevBtn.addEventListener("click", () => { goPrev(true); restartAutoplay(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { goNext(true); restartAutoplay(); });
  
    // Hover pause desktop only
    const canHover = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
    if (canHover) {
      root.addEventListener("mouseenter", stopAutoplay);
      root.addEventListener("mouseleave", startAutoplay);
    }
  
    // Resize: bez animacji przelicz pozycję
    window.addEventListener("resize", () => {
      setTransition(false);
      apply();
      requestAnimationFrame(() => setTransition(true));
    });
  
    // Init
    renderDots();
    snapOn();
    apply();
    track.offsetHeight;
    snapOff();
    startAutoplay();
  }
  
  window.__initCarousel = initCarousel;
  