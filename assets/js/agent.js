(function (global) {
  "use strict";

  var utils = global.PF || {};
  var $ = utils.$ || function (selector, scope) {
    return (scope || document).querySelector(selector);
  };
  var $$ = utils.$$ || function (selector, scope) {
    return Array.prototype.slice.call(
      (scope || document).querySelectorAll(selector)
    );
  };
  var onReady = utils.onReady || function (fn) {
    fn();
  };
  var prefersReducedMotion = utils.prefersReducedMotion || function () {
    return false;
  };
  var isTouchDevice = utils.isTouchDevice || function () {
    return false;
  };

  var ENDPOINT = "https://portafolio-jio13.vercel.app/api/chat";

  var SESSION_ID = "pf-" + Math.random().toString(36).slice(2, 10);

  var GREETING =
    "Hola, soy el agente de Juan. Puedo contarles sobre su stack, sus " +
    "proyectos, su experiencia o cómo contactarlo. ¿Qué querés saber?";

  var BOOT_LINES = [
    "init sesión segura · " + SESSION_ID,
    "cargando contexto del portfolio…",
    "indexando proyectos y certificaciones…",
    "canal seguro listo · agente en línea"
  ];

  function makeEl(tag, className, text) {
    var node = global.document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderMarkdown(text) {
    if (!text) return "";
    var html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a class="term-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/`([^`]+)`/g, '<code class="term-code">$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    return html;
  }

  /* ============================ UI ============================ */

  function initAgent() {
    var root = $("[data-agent]");
    if (!root) return;

    var screen = $("[data-agent-log]", root);
    var form = $("[data-agent-form]", root);
    var input = $("[data-agent-input]", root);
    var sendBtn = $("[data-agent-send]", root);
    var status = $("[data-agent-status]", root);
    var statusText = $("[data-agent-status-text]", root);
    var live = $("[data-agent-live]", root);

    if (!screen || !form || !input) return;

    var busy = false;
    var started = false;
    var closing = false;

    function scrollBottom() {
      screen.scrollTop = screen.scrollHeight;
    }

    function setStatus(name, label) {
      if (!status) return;
      status.className = "terminal__status is-" + name;
      if (statusText && label) statusText.textContent = label;
    }

    function addLine(type, tag, text, extraClass) {
      var line = makeEl(
        "div",
        "term-line term-line--" + type + (extraClass ? " " + extraClass : "")
      );
      var body = makeEl("span", "term-line__text", text);
      line.appendChild(makeEl("span", "term-line__tag", tag));
      line.appendChild(body);
      screen.appendChild(line);
      scrollBottom();
      line.body = body;
      return line;
    }

    function typeText(container, text, onDone) {
      container.textContent = "";

      if (prefersReducedMotion()) {
        container.innerHTML = renderMarkdown(text);
        scrollBottom();
        if (onDone) onDone();
        return;
      }

      var textNode = global.document.createTextNode("");
      var cursor = makeEl("span", "term-cursor");
      container.appendChild(textNode);
      container.appendChild(cursor);

      var total = text.length;
      var index = 0;

      var timer = global.setInterval(function () {
        index += 2 + Math.floor(Math.random() * 3);

        if (index >= total) {
          global.clearInterval(timer);
          cursor.remove();
          container.innerHTML = renderMarkdown(text);
          scrollBottom();
          if (onDone) onDone();
          return;
        }

        textNode.data = text.slice(0, index);
        scrollBottom();
      }, 10);
    }

    function boot() {
      if (started) return;
      started = true;

      var step = 0;

      function next() {
        if (step < BOOT_LINES.length) {
          var isLast = step === BOOT_LINES.length - 1;
          addLine(
            "system",
            isLast ? "[info]" : "[ ok ]",
            BOOT_LINES[step],
            isLast ? "term-line--info" : ""
          );
          step += 1;
          global.setTimeout(next, prefersReducedMotion() ? 0 : 240);
          return;
        }

        setStatus("online", "online");

        var line = addLine("agent", "agente", "");
        busy = true;
        if (sendBtn) sendBtn.disabled = true;
        typeText(line.body, GREETING, function () {
          busy = false;
          if (sendBtn) sendBtn.disabled = false;
          if (!isTouchDevice() && dialog.open) {
            input.focus({ preventScroll: true });
          }
        });
      }

      next();
    }

    async function askAgent(message) {
      var url = ENDPOINT || "/api/chat";
      try {
        var response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ message: message })
        });

        var data = await response.json();
        if (response.ok && data && data.reply) {
          return data.reply;
        }

        if (data && (data.error || data.details)) {
          return "Error del servidor: " + (data.details || data.error);
        }
      } catch (err) {
        return "No se pudo conectar con el agente (" + err.message + "). Verificá tu conexión a internet.";
      }

      return "No pude obtener una respuesta en este momento.";
    }

    function ask(message) {
      if (busy) return;

      busy = true;
      if (sendBtn) sendBtn.disabled = true;
      setStatus("typing", "pensando…");

      addLine("user", "guest~$", message);
      var thinking = addLine("system", "[ .. ]", "pensando…");

      askAgent(message).then(function (answer) {
        thinking.remove();
        setStatus("online", "online");

        var line = addLine("agent", "agente", "");
        typeText(line.body, answer, function () {
          if (live) live.textContent = answer;
          busy = false;
          if (sendBtn) sendBtn.disabled = false;
          if (!isTouchDevice()) input.focus({ preventScroll: true });
        });
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var message = input.value.trim();
      if (!message || busy) return;

      input.value = "";
      ask(message);
    });

    $$("[data-agent-prompt]", root).forEach(function (chip) {
      chip.addEventListener("click", function () {
        var prompt = chip.getAttribute("data-agent-prompt") || "";
        if (!prompt) return;
        if (busy) return;
        input.value = "";
        ask(prompt);
      });
    });

    var dialog = root;
    var triggers = $$("[data-agent-open]");
    var closers = $$("[data-agent-close]", root);

    function openDialog() {
      if (closing) return;

      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }

      global.document.documentElement.classList.add("no-scroll");

      if (!started) {
        boot();
      } else if (!isTouchDevice()) {
        input.focus({ preventScroll: true });
      }
    }

    function finishClose() {
      closing = false;
      dialog.classList.remove("is-closing");

      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }

      global.document.documentElement.classList.remove("no-scroll");
    }

    /* Animación de salida antes de cerrar; sin motion, cierre directo. */
    function closeDialog() {
      if (!dialog.open || closing) return;

      if (prefersReducedMotion() || typeof dialog.close !== "function") {
        finishClose();
        return;
      }

      closing = true;
      dialog.classList.add("is-closing");
      global.setTimeout(finishClose, 240);
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        openDialog();
      });
    });

    closers.forEach(function (button) {
      button.addEventListener("click", closeDialog);
    });

    /* Esc cierra con la misma animación de salida. */
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeDialog();
    });

    /* Clic en el fondo (fuera del terminal) cierra. */
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
    });

    /* Esc (nativo) y cierre por botón liberan el scroll. */
    dialog.addEventListener("close", function () {
      global.document.documentElement.classList.remove("no-scroll");
    });

    /* Atajo de teclado: Ctrl/Cmd + K abre la consola. */
    global.document.addEventListener("keydown", function (event) {
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "k" || event.key === "K")
      ) {
        event.preventDefault();
        if (!dialog.open) openDialog();
      }
    });
  }

  onReady(initAgent);
})(window);
