/**
 * Fondo de estrellas, sin dependencias externas.
 *
 * Un cielo de puntos sobre un canvas fijo detrás de todo el contenido.
 * Las estrellas tienen profundidad y se desplazan un poco siguiendo al
 * mouse (parallax), con un leve titileo. Simple y sobrio: no compite con
 * el contenido.
 *
 * Se apaga con prefers-reduced-motion y pausa cuando la pestaña no está
 * visible.
 */
(function (global) {
  "use strict";

  var utils = global.PF || {};
  var $ = utils.$ || function () {
    return null;
  };
  var onReady = utils.onReady || function (fn) {
    fn();
  };
  var debounce = utils.debounce || function (fn) {
    return fn;
  };
  var prefersReducedMotion = utils.prefersReducedMotion || function () {
    return false;
  };

  var MAX_PARALLAX = 26;

  function initStars() {
    var canvas = $("[data-bg-canvas]");

    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");

    if (!ctx) return;

    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var stars = [];
    var pointer = { x: 0.5, y: 0.5 };
    var target = { x: 0.5, y: 0.5 };
    var raf = null;
    var time = 0;

    function seed() {
      var count = Math.min(260, Math.round((width * height) / 6800));
      stars = [];

      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          depth: 0.25 + Math.random() * 0.75,
          radius: 0.35 + Math.random() * 1.15,
          phase: Math.random() * Math.PI * 2,
          violet: Math.random() < 0.38
        });
      }
    }

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function draw() {
      time += 0.016;
      pointer.x += (target.x - pointer.x) * 0.05;
      pointer.y += (target.y - pointer.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      var px = pointer.x - 0.5;
      var py = pointer.y - 0.5;

      for (var i = 0; i < stars.length; i++) {
        var star = stars[i];
        var offset = MAX_PARALLAX * star.depth;
        var x = star.x + px * offset;
        var y = star.y + py * offset;

        var twinkle = 0.65 + 0.35 * Math.sin(time * 1.4 + star.phase);
        var alpha = (0.18 + 0.62 * star.depth) * twinkle;

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = star.violet
          ? "rgb(217, 139, 255)"
          : "rgb(233, 228, 255)";
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      raf = global.requestAnimationFrame(draw);
    }

    function start() {
      if (raf === null) raf = global.requestAnimationFrame(draw);
    }

    function stop() {
      if (raf !== null) {
        global.cancelAnimationFrame(raf);
        raf = null;
      }
    }

    function onPointer(event) {
      target.x = event.clientX / global.innerWidth;
      target.y = event.clientY / global.innerHeight;
    }

    resize();
    start();

    global.addEventListener("resize", debounce(resize, 150));
    global.addEventListener("mousemove", onPointer, { passive: true });

    global.document.addEventListener("visibilitychange", function () {
      if (global.document.hidden) {
        stop();
      } else {
        start();
      }
    });
  }

  onReady(function () {
    if (prefersReducedMotion()) return;

    initStars();
  });
})(window);
