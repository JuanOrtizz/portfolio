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

  var FALLBACK =
    "Todavía no tengo esa respuesta. Probá con stack, proyectos, " +
    "experiencia, certificaciones o contacto.";

  var RULES = [
    {
      test: /(hola|buenas|hey|que tal|quien sos|quien eres|que haces)/,
      answer:
        "¡Hola! Soy el agente de Juan. Preguntame por su stack, sus " +
        "proyectos, su experiencia o cómo contactarlo."
    },
    {
      test: /(stack|tecnolog|lenguaje|backend|frontend|herramienta|skills|con que trabaja)/,
      answer:
        "Juan trabaja con Python, JavaScript, Kotlin, C# y SQL. En backend: " +
        "Django, DRF, Node/Express, .NET, JWT y APIs REST. En IA: LLMs, RAG, " +
        "MCP, prompt engineering y n8n. En frontend: React, HTML/CSS y GSAP."
    },
    {
      test: /(proyecto|portfolio|practicasa|trainium|mate|hipotec|tradeflow|chatbot|veterinaria|cabana)/,
      answer:
        "En la sección Proyectos hay 10 trabajos: Practicasa (gestión " +
        "inmobiliaria), TrainiumNeon (gimnasio), Mate-Style (e-commerce), " +
        "Simulador Hipotecario, MiCabaña, TradeFlow, Chatbots y una " +
        "veterinaria con consola. Varios tienen demo online."
    },
    {
      test: /(experiencia|trabajo|trabajaste|laburo|empresa|puesto)/,
      answer:
        "Su experiencia combina desarrollo fullstack y agentes " +
        "conversacionales conectados a bases de datos reales. El detalle " +
        "está en la sección Experiencia."
    },
    {
      test: /(estudio|educacion|carrera|uces|titulo|facultad)/,
      answer:
        "Es Técnico Universitario en Programación de Sistemas (UCES). " +
        "Podés ver la formación en la sección Formación."
    },
    {
      test: /(certific|curso|daxus|codigo facilito|big school|salesforce)/,
      answer:
        "Sigue sumando certificaciones: agentes de IA, Docker, Python, n8n, " +
        "desarrollo con IA y más. Están listadas en Formación con emisor y " +
        "fecha."
    },
    {
      test: /(contacto|email|mail|linkedin|github|hablar|contratar|disponible|cv)/,
      answer:
        "Podés escribirle a juan_ignaortiz@outlook.com, por LinkedIn (Juan " +
        "Ignacio Ortiz) o ver su código en github.com/JuanOrtizz."
    },
    {
      test: /(agente|n8n|como funciona|consola|webhook)/,
      answer:
        "Esta consola se conecta a un agente en n8n por webhook, con " +
        "respuestas sobre el portfolio y sus proyectos."
    },
    {
      test: /(gracias|genial|buenisimo|dale|perfecto)/,
      answer:
        "¡De nada! Si querés, preguntame por el stack, los proyectos o el " +
        "contacto."
    }
  ];

  /* ============================ HELPERS ============================ */

  function normalize(value) {
    return (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function demoAnswer(message) {
    var text = normalize(message);

    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].test.test(text)) return RULES[i].answer;
    }

    return FALLBACK;
  }

  function makeEl(tag, className, text) {
    var node = global.document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
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
        container.textContent = text;
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
        index += 1 + Math.floor(Math.random() * 2);

        if (index >= total) {
          index = total;
          global.clearInterval(timer);
          textNode.data = text;
          scrollBottom();
          cursor.remove();
          if (onDone) onDone();
          return;
        }

        textNode.data = text.slice(0, index);
        scrollBottom();
      }, 14);
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

        if (response.ok) {
          var data = await response.json();
          if (data && data.reply) {
            return data.reply;
          }
        }
      } catch (err) {
      }

      return new Promise(function (resolve) {
        global.setTimeout(
          function () {
            resolve(demoAnswer(message));
          },
          prefersReducedMotion() ? 0 : 400 + Math.random() * 300
        );
      });
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
