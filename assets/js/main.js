/**
 * Main — header, menú móvil, link activo, año del footer y carrusel.
 */
(function (global) {
  "use strict";

  var document = global.document;
  var utils = global.PF;
  var $ = utils.$;
  var $$ = utils.$$;
  var onReady = utils.onReady;

  function initHeader() {
    var header = $("[data-header]");
    if (!header) return;

    var onScroll = function () {
      header.classList.toggle("is-scrolled", global.scrollY > 24);
    };

    onScroll();
    global.addEventListener("scroll", onScroll, { passive: true });
  }

  function initMobileNav() {
    var toggle = $("[data-nav-toggle]");
    var nav = $("[data-nav]");
    if (!toggle || !nav) return;

    var releaseTrap = null;

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute(
        "aria-label",
        open ? "Cerrar menú" : "Abrir menú"
      );
      document.documentElement.classList.toggle("no-scroll", open);

      if (open) {
        releaseTrap = utils.trapFocus(nav);
        var firstLink = $(".nav__link", nav);
        if (firstLink) firstLink.focus();
      } else if (releaseTrap) {
        releaseTrap();
        releaseTrap = null;
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    $$(".nav__link", nav).forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    var desktop = global.matchMedia("(min-width: 48.0625rem)");
    var onChange = function (event) {
      if (event.matches) setOpen(false);
    };

    if (desktop.addEventListener) {
      desktop.addEventListener("change", onChange);
    } else if (desktop.addListener) {
      desktop.addListener(onChange);
    }
  }

  function initActiveLink() {
    var links = $$(".nav__link");
    var sections = links
      .map(function (link) {
        return document.getElementById(link.getAttribute("href").slice(1));
      })
      .filter(Boolean);

    if (!sections.length || !("IntersectionObserver" in global)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          links.forEach(function (link) {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function initYear() {
    var target = $("[data-year]");
    if (!target) return;

    target.textContent = String(new Date().getFullYear());
  }

  function initCarousel() {
    var root = $("[data-carousel]");
    if (!root) return;

    var track = $("[data-carousel-track]", root);
    var slides = $$("[data-slide]", track);
    if (!slides.length) return;

    var prevBtn = $("[data-carousel-prev]", root);
    var nextBtn = $("[data-carousel-next]", root);
    var currentOut = $("[data-carousel-current]", root);
    var totalOut = $("[data-carousel-total]", root);
    var bar = $("[data-carousel-bar]", root);

    /* Cuántas tarjetas entran por vista (la grilla es 3×2 en desktop). */
    var pageSize =
      Number(root.getAttribute("data-carousel-page-size")) || 6;
    var pageCount = Math.ceil(slides.length / pageSize);
    var page = -1;

    if (totalOut) totalOut.textContent = String(pageCount);

    function nearestIndex() {
      var min = Infinity;
      var idx = 0;

      slides.forEach(function (slide, i) {
        var distance = Math.abs(slide.offsetLeft - track.scrollLeft);
        if (distance < min) {
          min = distance;
          idx = i;
        }
      });

      return idx;
    }

    function pageAtScroll() {
      return Math.floor(nearestIndex() / pageSize);
    }

    function maxScroll() {
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }

    function render() {
      var next = pageAtScroll();

      if (next !== page) {
        page = next;
        slides.forEach(function (slide, i) {
          slide.classList.toggle(
            "is-active",
            Math.floor(i / pageSize) === page
          );
        });

        if (currentOut) currentOut.textContent = String(page + 1);
      }

      if (bar) {
        var ratio = maxScroll() ? track.scrollLeft / maxScroll() : 0;
        var share = track.clientWidth / track.scrollWidth;
        bar.style.width = Math.max(share * 100, 8) + "%";
        bar.style.transform = "translateX(" + ratio * (100 / share - 100) + "%)";
      }

      var noScroll = maxScroll() <= 1;
      if (prevBtn) prevBtn.disabled = noScroll || page <= 0;
      if (nextBtn) nextBtn.disabled = noScroll || page >= pageCount - 1;
    }

    function goTo(target) {
      var clamped = Math.max(0, Math.min(target, pageCount - 1));
      var left = Math.min(slides[clamped * pageSize].offsetLeft, maxScroll());
      track.scrollTo({
        left: left,
        behavior: utils.prefersReducedMotion() ? "auto" : "smooth"
      });
    }

    var ticking = false;

    track.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        global.requestAnimationFrame(function () {
          render();
          ticking = false;
        });
      },
      { passive: true }
    );

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goTo(page - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(page + 1);
      });
    }

    track.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(page + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(page - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(pageCount - 1);
      }
    });

    /* Arrastre con mouse y touch. */
    var dragging = false;
    var startX = 0;
    var startScroll = 0;
    var moved = 0;

    track.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch") return;

      dragging = true;
      moved = 0;
      startX = event.clientX;
      startScroll = track.scrollLeft;
      track.classList.add("is-dragging");
    });

    track.addEventListener("pointermove", function (event) {
      if (!dragging) return;

      moved = event.clientX - startX;
      track.scrollLeft = startScroll - moved;
    });

    function endDrag() {
      if (!dragging) return;

      dragging = false;
      track.classList.remove("is-dragging");

      if (Math.abs(moved) > 12) goTo(pageAtScroll());
    }

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("pointerleave", endDrag);

    /* Evita que el arrastre dispare el link del proyecto. */
    track.addEventListener(
      "click",
      function (event) {
        if (Math.abs(moved) > 12) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );

    /* Corrige el desvío de pocos píxeles que a veces deja el scroll-snap,
       para que la tarjeta de la izquierda no quede recortada. */
    function snapExact() {
      var target = slides[nearestIndex()].offsetLeft;
      if (track.scrollLeft !== target && Math.abs(track.scrollLeft - target) <= 8) {
        track.scrollLeft = target;
      }
    }

    if ("onscrollend" in global) {
      track.addEventListener("scrollend", snapExact);
    } else {
      track.addEventListener("scroll", utils.debounce(snapExact, 180));
    }

    global.addEventListener("resize", utils.debounce(render, 150));

    track.classList.add("is-ready");
    render();
  }

  /* Scroll con inercia: interpolamos la posición del documento hacia un
     objetivo para que la página siga deslizando un instante después de
     soltar la rueda. Se omite en táctil o si el usuario prefiere menos
     movimiento (ahí el scroll nativo es lo correcto). */
  var smoothScroll = null;

  function initSmoothScroll() {
    if (utils.prefersReducedMotion()) return;
    if (global.matchMedia && global.matchMedia("(hover: none)").matches) return;

    var EASE = 0.12;
    var current = global.scrollY;
    var target = current;
    var raf = null;

    function maxScroll() {
      return Math.max(
        0,
        document.documentElement.scrollHeight - global.innerHeight
      );
    }

    function clamp(value) {
      return Math.max(0, Math.min(value, maxScroll()));
    }

    function frame() {
      current += (target - current) * EASE;

      if (Math.abs(target - current) < 0.5) current = target;

      global.scrollTo({ top: current, left: 0, behavior: "instant" });

      raf = current === target ? null : global.requestAnimationFrame(frame);
    }

    function start() {
      if (raf === null) raf = global.requestAnimationFrame(frame);
    }

    function to(value) {
      target = clamp(value);
      start();
    }

    function onWheel(event) {
      if (event.ctrlKey || event.defaultPrevented) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      event.preventDefault();

      var unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? global.innerHeight : 1;

      to(target + event.deltaY * unit);
    }

    global.addEventListener("wheel", onWheel, { passive: false });

    /* Si el scroll lo movió otra vía (teclado, ancla, barra), resincronizamos. */
    global.addEventListener(
      "scroll",
      function () {
        if (raf !== null) return;
        current = global.scrollY;
        target = current;
      },
      { passive: true }
    );

    global.addEventListener("resize", function () {
      target = clamp(target);
    });

    smoothScroll = { to: to };
  }

  function initToTop() {
    var button = $("[data-to-top]");
    if (!button) return;

    var onScroll = function () {
      button.classList.toggle("is-visible", global.scrollY > 480);
    };

    onScroll();
    global.addEventListener("scroll", onScroll, { passive: true });

    button.addEventListener("click", function () {
      if (smoothScroll) {
        smoothScroll.to(0);
        return;
      }

      global.scrollTo({
        top: 0,
        behavior: utils.prefersReducedMotion() ? "instant" : "smooth"
      });
    });
  }

  onReady(function () {
    initHeader();
    initMobileNav();
    initActiveLink();
    initYear();
    initCarousel();
    initSmoothScroll();
    initToTop();
  });
})(window);
