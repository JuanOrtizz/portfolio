/**
 * Utils — helpers compartidos por el resto de los scripts.
 * Sin dependencias externas.
 */
(function (global) {
  "use strict";

  var $ = function (selector, scope) {
    return (scope || document).querySelector(selector);
  };

  var $$ = function (selector, scope) {
    return Array.prototype.slice.call(
      (scope || document).querySelectorAll(selector)
    );
  };

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  function prefersReducedMotion() {
    return (
      global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isTouchDevice() {
    return global.matchMedia("(hover: none)").matches;
  }

  var FOCUSABLE =
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  /**
   * Mantiene el foco dentro del contenedor mientras esté activo.
   * Devuelve una función para liberar el bloqueo.
   */
  function trapFocus(container) {
    function onKeydown(event) {
      if (event.key !== "Tab") return;

      var items = $$(FOCUSABLE, container).filter(function (el) {
        return el.offsetParent !== null;
      });

      if (!items.length) return;

      var first = items[0];
      var last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", onKeydown);

    return function release() {
      container.removeEventListener("keydown", onKeydown);
    };
  }

  global.PF = {
    $: $,
    $$: $$,
    onReady: onReady,
    debounce: debounce,
    prefersReducedMotion: prefersReducedMotion,
    isTouchDevice: isTouchDevice,
    trapFocus: trapFocus
  };
})(window);
