/**
 * GSAP animations — intro del hero y revelado al hacer scroll.
 *
 * El estado inicial (opacity 0, translateY) vive en utilities.css.
 * Por eso acá se anima HACIA el estado visible con gsap.to(), no con
 * gsap.from(): un `from` usaría como valor final el 0 del CSS y el bloque
 * nunca aparecería.
 *
 * Si GSAP o ScrollTrigger no cargan (sin red, CDN caído, adblock), el sitio
 * sigue siendo visible: revealAll() muestra todo al instante.
 */
(function (global) {
  "use strict";

  var utils = global.PF || {};
  var $$ = utils.$$ || function () { return []; };
  var $ = utils.$ || function () { return null; };
  var onReady = utils.onReady || function (fn) { fn(); };
  var prefersReducedMotion = utils.prefersReducedMotion || function () {
    return false;
  };

  var REVEAL_PROPS = "opacity,transform";

  function showAll() {
    $$("[data-reveal]").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /**
   * Al terminar el tween delegamos el estado final a la clase .is-visible
   * (definida en CSS) y limpiamos los estilos inline.
   */
  function finish(targets) {
    global.gsap.set(targets, { clearProps: REVEAL_PROPS });
    targets.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  function initHero() {
    var intro = $$("[data-reveal]").slice(0, 4);

    if (!intro.length) return;

    global.gsap.fromTo(
      intro,
      {
        opacity: 0,
        y: 30,
        rotateX: -10,
        transformPerspective: 900,
        transformOrigin: "50% 100%"
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.1,
        onComplete: function () {
          finish(intro);
        }
      }
    );
  }

  function initScrollReveals() {
    var blocks = $$("[data-reveal]").slice(4);

    if (!blocks.length) return;

    blocks.forEach(function (el) {
      global.gsap.fromTo(
        el,
        {
          opacity: 0,
          y: 46,
          rotateX: -14,
          transformPerspective: 900,
          transformOrigin: "50% 100%"
        },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 86%",
            once: true,
            onEnter: function () {
              el.classList.add("is-visible");
            }
          },
          onComplete: function () {
            finish([el]);
          }
        }
      );
    });
  }

  function initScrollHint() {
    var hint = $(".hero__scroll");

    if (!hint) return;

    global.gsap.to(hint, {
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });
  }

  function initScrollProgress() {
    var bar = $("[data-scroll-progress]");

    if (!bar) return;

    global.gsap.set(bar, { width: "0%" });

    global.gsap.to(bar, {
      width: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: global.document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.4
      }
    });
  }

  /**
   * Flotación suave de la foto del hero. Anima una variable CSS en la figura
   * para que el anillo y el glow, que son pseudo-elementos, la sigan sin
   * desfasarse (el <img> y ambos pseudos usan `translate: 0 var(--float-y)`).
   */
  function initHeroFloat() {
    var photo = $(".hero__photo");

    if (!photo) return;

    global.gsap.to(photo, {
      "--float-y": "-12px",
      duration: 3.2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: 1.1
    });
  }

  /**
   * Rotación de roles en el header. Cada rol se muestra HOLD y después hay
   * un crossfade FADE simultáneo hacia el siguiente, así los tiempos de
   * visibilidad de todos los roles son idénticos.
   * Sin JS (o con reduced motion) queda visible sólo el primero, que es el
   * estado por defecto del CSS.
   */
  function initBrandRoles() {
    var root = $("[data-brand-roles]");

    if (!root) return;

    var roles = root.querySelectorAll(".brand__role");

    if (roles.length < 2) return;

    var HOLD = 1.8;
    var FADE = 0.4;

    global.gsap.set(roles, { autoAlpha: 0, y: 6 });
    global.gsap.set(roles[0], { autoAlpha: 1, y: 0 });

    var timeline = global.gsap.timeline({ delay: HOLD, repeat: -1 });

    for (var i = 0; i < roles.length; i++) {
      var next = roles[(i + 1) % roles.length];

      timeline
        .to(roles[i], {
          autoAlpha: 0,
          y: -6,
          duration: FADE,
          ease: "power2.inOut"
        })
        .to(next, {
          autoAlpha: 1,
          y: 0,
          duration: FADE,
          ease: "power2.inOut"
        }, "<")
        .to(roles, { duration: HOLD });
    }
  }

  /**
   * Parallax suave de la foto del hero mientras se hace scroll.
   */
  function initHeroParallax() {
    var photo = $(".hero__photo");

    if (!photo) return;

    global.gsap.to(photo, {
      yPercent: 14,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });
  }

  /**
   * Aparición escalonada de los tags dentro de cada grupo de skills.
   */
  function initTagStagger() {
    var groups = $$(".skill-group");

    if (!groups.length) return;

    groups.forEach(function (group) {
      var tags = group.querySelectorAll(".tag");

      if (tags.length < 2) return;

      global.gsap.set(tags, { opacity: 0, y: 8 });

      global.gsap.to(tags, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.03,
        scrollTrigger: {
          trigger: group,
          start: "top 85%",
          once: true
        },
        onComplete: function () {
          global.gsap.set(tags, { clearProps: "opacity,transform" });
        }
      });
    });
  }

  /**
   * Revelado palabra por palabra de los títulos de sección. Se parte el
   * texto en <span> y se animan en cascada. Si no hay GSAP, los títulos
   * quedan tal cual (no se parten).
   */
  function splitWords(el) {
    var text = el.textContent.replace(/\s+/g, " ").trim();

    if (!text) return [];

    var words = text.split(" ");
    var spans = [];

    el.textContent = "";

    words.forEach(function (word, index) {
      var span = global.document.createElement("span");
      span.className = "js-word";
      span.textContent = word;
      el.appendChild(span);
      if (index < words.length - 1) {
        el.appendChild(global.document.createTextNode(" "));
      }
      spans.push(span);
    });

    return spans;
  }

  function initTextReveals() {
    $$(".section__title").forEach(function (title) {
      var words = splitWords(title);

      if (words.length < 2) return;

      global.gsap.set(words, { opacity: 0, yPercent: 60 });

      global.gsap.to(words, {
        opacity: 1,
        yPercent: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.05,
        scrollTrigger: {
          trigger: title,
          start: "top 88%",
          once: true
        },
        onComplete: function () {
          global.gsap.set(words, { clearProps: "opacity,transform" });
        }
      });
    });
  }

  /**
   * Aparición escalonada de las listas dentro de las tarjetas (viñetas de
   * experiencia y tags de proyectos).
   */
  function initListStagger() {
    $$(".timeline__list, .tag-list--tight").forEach(function (list) {
      var items = Array.prototype.slice.call(list.children);

      if (items.length < 2) return;

      global.gsap.fromTo(
        items,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.06,
          scrollTrigger: {
            trigger: list,
            start: "top 88%",
            once: true
          },
          onComplete: function () {
            global.gsap.set(items, { clearProps: "opacity,transform" });
          }
        }
      );
    });
  }

  /**
   * Revelado de las tarjetas de proyectos. No usan [data-reveal] porque
   * el carrusel controla su propio transform (escala del slide), así que
   * se animan aparte y al terminar se limpian los estilos para devolverle
   * el control al carrusel.
   */
  function initProjectReveal() {
    var cards = $$(".project");

    if (!cards.length) return;

    global.gsap.set(cards, {
      autoAlpha: 0,
      y: 44,
      rotateX: -12,
      transformPerspective: 900,
      transformOrigin: "50% 100%"
    });

    global.gsap.to(cards, {
      autoAlpha: 1,
      y: 0,
      rotateX: 0,
      duration: 0.85,
      ease: "power3.out",
      stagger: 0.07,
      scrollTrigger: {
        trigger: ".carousel",
        start: "top 84%",
        once: true
      },
      onComplete: function () {
        global.gsap.set(cards, { clearProps: "opacity,visibility,transform" });
      }
    });
  }

  onReady(function () {
    if (prefersReducedMotion() || !(global.gsap && global.ScrollTrigger)) {
      showAll();
      return;
    }

    global.gsap.registerPlugin(global.ScrollTrigger);

    initHero();
    initScrollReveals();
    initScrollHint();
    initScrollProgress();
    initHeroFloat();
    initHeroParallax();
    initTagStagger();
    initBrandRoles();
    initTextReveals();
    initListStagger();
    initProjectReveal();
  });
})(window);
