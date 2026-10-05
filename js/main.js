/* ==========================================================================
   EL CREW — interacciones
   Sin dependencias. Todo lo que anima respeta prefers-reduced-motion y el
   contenido queda completo y visible si el JS no carga.
   ========================================================================== */
(function () {
  "use strict";

  var raiz = document.documentElement;
  raiz.classList.add("js");
  // El <head> quita .js a los 3 s si esto no llega a correr (todo visible sin JS).
  window.elCrewListo = true;

  var reducir = window.matchMedia("(prefers-reduced-motion: reduce)");
  var escritorio = window.matchMedia("(min-width: 56.25em)");

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------ Año */
  var anio = $("#anio");
  if (anio) anio.textContent = String(new Date().getFullYear());

  /* --------------------------------------------------------- Cabecera
     Se disuelve al bajar y vuelve al subir (patrón «hide on scroll down,
     show on scroll up», como Headroom.js). Pasar el cursor por la franja
     superior o llegar con el tabulador la muestra: eso lo resuelve el CSS. */
  var cabecera = $("#cabecera");
  if (cabecera) {
    var TOLERANCIA = 10;           // px seguidos en una dirección antes de cambiar
    var ultimaY = 0, recorrido = 0, oculta = false, conSombra = false;
    var bloqueada = false, finBloqueo = 0, focoPendiente = null;

    var ponerOculta = function (valor) {
      if (valor === oculta) return;
      oculta = valor;
      cabecera.classList.toggle("oculta", valor);
    };
    var menuAbierto = function () { return !!$(".cabecera__menu[aria-expanded='true']", cabecera); };

    /* Mientras el navegador desplaza por su cuenta (enlace interno o foco) la
       cabecera no cambia; se libera 150 ms después del último scroll. Si el
       foco terminó debajo de ella, se quita de en medio. */
    var bloquear = function () {
      bloqueada = true;
      clearTimeout(finBloqueo);
      finBloqueo = setTimeout(function () {
        bloqueada = false;
        recorrido = 0;
        if (focoPendiente && !oculta && focoPendiente.getBoundingClientRect().top < cabecera.offsetHeight) ponerOculta(true);
        focoPendiente = null;
      }, 150);
    };

    var alDesplazar = function () {
      // el rebote de iOS pasa del final y vuelve: se acota para que no cuente como subir
      var maximo = document.documentElement.scrollHeight - window.innerHeight;
      var y = Math.min(Math.max(window.scrollY, 0), maximo);
      var delta = y - ultimaY;
      ultimaY = y;

      var sombra = y > 4;
      if (sombra !== conSombra) { conSombra = sombra; cabecera.classList.toggle("con-sombra", sombra); }

      if (y <= cabecera.offsetHeight || menuAbierto()) { recorrido = 0; ponerOculta(false); return; }
      if (bloqueada) { bloquear(); return; }
      if (!delta) return;

      // se acumula en una sola dirección; al cambiar de dirección se empieza de cero
      recorrido = (delta > 0) === (recorrido > 0) ? recorrido + delta : delta;
      if (recorrido > TOLERANCIA) ponerOculta(true);
      else if (recorrido < -TOLERANCIA) ponerOculta(false);
    };

    // Saltar a una sección: llega al borde superior sin la cabecera encima.
    document.addEventListener("click", function (e) {
      var enlace = e.target.closest && e.target.closest('a[href^="#"]');
      var destino = enlace && enlace.getAttribute("href").length > 1 && document.getElementById(enlace.getAttribute("href").slice(1));
      if (!destino) return;
      bloquear();
      if (destino.getBoundingClientRect().top + window.scrollY > cabecera.offsetHeight) ponerOculta(true);
    });

    // Foco en algo que la cabecera taparía: se revisa cuando termina de desplazarse.
    document.addEventListener("focusin", function (e) {
      if (oculta || cabecera.contains(e.target)) return;
      focoPendiente = e.target;
      bloquear();
    });

    window.addEventListener("scroll", alDesplazar, { passive: true });
    ultimaY = window.scrollY;
    alDesplazar();
    // al abrir un enlace con #sección, la sección queda arriba sin nada encima
    if (location.hash && window.scrollY > cabecera.offsetHeight) ponerOculta(true);
  }

  /* --------------------------------------------------------- Menú móvil */
  var botonMenu = $(".cabecera__menu");
  var menuMovil = $("#menu-movil");

  if (botonMenu && menuMovil) {
    var ponerMenu = function (abierto) {
      botonMenu.setAttribute("aria-expanded", String(abierto));
      botonMenu.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
      menuMovil.hidden = !abierto;
    };
    botonMenu.addEventListener("click", function () {
      ponerMenu(botonMenu.getAttribute("aria-expanded") !== "true");
    });
    menuMovil.addEventListener("click", function (e) {
      if (e.target.closest("a")) ponerMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menuMovil.hidden) { ponerMenu(false); botonMenu.focus(); }
    });
    escritorio.addEventListener("change", function (e) { if (e.matches) ponerMenu(false); });
  }

  /* ------------------------------------------------ Scroll por pantallas
     Escritorio con mouse o trackpad: cada gesto lleva, con una transición
     suave, a la parada siguiente. Paradas: el inicio de cada sección y, en
     las que son más altas que la ventana (Servicios, a veces Contacto),
     también su final; entre esos dos puntos el scroll es libre.
     La inercia del trackpad no encadena saltos: un gesto = un salto.
     Lo mismo con AvPág / RePág / espacio / flechas y con los enlaces
     internos. Sin JS, el scroll-snap del CSS hace una versión básica.

     Las secciones empiezan en fracciones de píxel (la cabecera mide
     86.39 px): el inicio se redondea hacia arriba y el final hacia abajo
     para que nunca asome una línea de la sección vecina.
     Una sección puede dar sus propias paradas (_paradas, en px desde su
     inicio): Proceso para en cada etapa y no tiene scroll libre. Ahí los
     saltos son más lentos, para que se vea la línea avanzar. */
  var modoPantallas = window.matchMedia("(min-width: 56.25em) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  var pantallas = $$(".hero, .nosotros, .servicios, .proceso, .clientes, .contacto, .pie");

  if (pantallas.length) {
    var PAUSA_GESTO = 180;      // ms sin eventos de rueda = empieza otro gesto
    var UMBRAL = 30;            // px de rueda para decidir un salto
    var animando = false, ultimaRueda = 0, acumulado = 0;
    var gestoLibre = false, gestoUsado = false;

    var mapa = function () {
      var vh = window.innerHeight;
      var maximo = document.documentElement.scrollHeight - vh;
      var paradas = [], tramos = [], lentos = [];
      pantallas.forEach(function (s, i) {
        var arriba = s.getBoundingClientRect().top + window.scrollY;
        var inicio = i === 0 ? 0 : arriba;           // la primera incluye la cabecera
        var fin = arriba + s.offsetHeight - vh;      // su borde inferior en el de la ventana
        var a = Math.min(Math.ceil(inicio), maximo);
        paradas.push(a);
        var propias = s._paradas && s._paradas();
        if (propias) {
          propias.forEach(function (d) { paradas.push(Math.min(Math.round(a + d), maximo)); });
          lentos.push([a, Math.min(Math.ceil(arriba + s.offsetHeight), maximo)]);
          return;
        }
        if (fin - inicio > 1) {
          var b = Math.min(Math.floor(fin), maximo);
          paradas.push(b);
          tramos.push([a, b]);
        }
      });
      paradas = paradas.filter(function (y, i, l) { return l.indexOf(y) === i; }).sort(function (x, y) { return x - y; });
      return { paradas: paradas, tramos: tramos, lentos: lentos };
    };

    // tramo de scroll libre en el que se está, mirando hacia dir
    var tramoLibre = function (y, dir, tramos) {
      return tramos.filter(function (t) {
        return dir > 0 ? y >= t[0] - 1 && y < t[1] - 1 : y > t[0] + 1 && y <= t[1] + 1;
      })[0];
    };

    var suavizar = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };

    var irA = function (destino, lenta) {
      var desde = window.scrollY, distancia = destino - desde;
      if (Math.abs(distancia) < 1) return;
      var duracion = lenta ? 1500 : 650 + Math.min(Math.abs(distancia), 1200) * .25;
      var t0 = null;
      animando = true;
      var paso = function (t) {
        if (t0 === null) t0 = t;
        var p = Math.min((t - t0) / duracion, 1);
        window.scrollTo({ top: desde + distancia * suavizar(p), behavior: "instant" });
        if (p < 1) requestAnimationFrame(paso);
        else animando = false;
      };
      requestAnimationFrame(paso);
    };

    /* Decide qué hace un movimiento de px (con signo) desde la posición actual.
       Devuelve true si lo resolvió el script (y hay que cancelar el nativo). */
    var mover = function (px, saltar) {
      var dir = px > 0 ? 1 : -1;
      var m = mapa(), y = window.scrollY;
      var tramo = tramoLibre(y, dir, m.tramos);
      if (tramo) {
        // libre dentro de la sección, sin pasarse de su borde
        var limite = dir > 0 ? tramo[1] : tramo[0];
        if ((dir > 0 && y + px > limite) || (dir < 0 && y + px < limite)) {
          window.scrollTo({ top: limite, behavior: "smooth" });
          return true;
        }
        return false;
      }
      if (!saltar) return true;
      var destino = dir > 0
        ? m.paradas.filter(function (p) { return p > y + 1; })[0]
        : m.paradas.filter(function (p) { return p < y - 1; }).pop();
      if (destino !== undefined) {
        // dentro de una sección con paradas propias (de una parada a otra, o a la siguiente sección)
        var lenta = m.lentos.some(function (t) { return y >= t[0] - 1 && y <= t[1] + 1 && destino >= t[0] - 1 && destino <= t[1] + 1; });
        irA(destino, lenta);
      }
      return true;
    };

    window.addEventListener("wheel", function (e) {
      if (!modoPantallas.matches || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      // un campo de texto con scroll propio se desplaza solo
      var campo = e.target.closest && e.target.closest("textarea");
      if (campo && campo.scrollHeight > campo.clientHeight) return;

      var ahora = performance.now();
      if (ahora - ultimaRueda > PAUSA_GESTO) { acumulado = 0; gestoLibre = false; gestoUsado = false; }
      ultimaRueda = ahora;
      if (animando) { e.preventDefault(); return; }

      // Firefox cuenta la rueda en líneas (deltaMode 1) o páginas (2)
      var px = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1);
      var m = mapa();
      if (tramoLibre(window.scrollY, px > 0 ? 1 : -1, m.tramos)) {
        gestoLibre = true;
        acumulado = 0;
        if (mover(px, false)) e.preventDefault();
        return;
      }
      e.preventDefault();
      // la cola de un gesto que ya saltó, o que venía desplazando libre, no salta
      if (gestoUsado || gestoLibre) return;
      acumulado += px;
      if (Math.abs(acumulado) < UMBRAL) return;
      gestoUsado = true;
      mover(acumulado, true);
    }, { passive: false });

    document.addEventListener("keydown", function (e) {
      if (!modoPantallas.matches || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      if (t.closest && t.closest("input, textarea, select, [contenteditable], [role=tab]")) return;
      var vh = window.innerHeight, px = 0;
      switch (e.key) {
        case "PageDown": px = vh * .875; break;
        case "PageUp": px = -vh * .875; break;
        case "ArrowDown": px = 40; break;
        case "ArrowUp": px = -40; break;
        case " ":
          // el espacio activa botones y enlaces; sólo desplaza si no hay uno enfocado
          if (t.closest && t.closest("button, a, summary")) return;
          px = e.shiftKey ? -vh * .875 : vh * .875;
          break;
        default: return;
      }
      if (animando) { e.preventDefault(); return; }
      if (mover(px, true)) e.preventDefault();
    });

    // Enlaces internos: misma transición, misma parada exacta.
    document.addEventListener("click", function (e) {
      if (!modoPantallas.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var enlace = e.target.closest && e.target.closest('a[href^="#"]');
      var id = enlace && enlace.getAttribute("href").slice(1);
      var destino = id && document.getElementById(id);
      if (!destino) return;
      e.preventDefault();
      var margen = parseFloat(getComputedStyle(destino).scrollMarginTop) || 0;
      var maximo = document.documentElement.scrollHeight - window.innerHeight;
      irA(Math.min(Math.max(Math.ceil(destino.getBoundingClientRect().top + window.scrollY - margen), 0), maximo));
      if (location.hash !== "#" + id) history.pushState(null, "", "#" + id);
      // el foco va al destino, como haría el enlace nativo
      if (!destino.matches("a, button, input, select, textarea, [tabindex]")) destino.setAttribute("tabindex", "-1");
      destino.focus({ preventScroll: true });
    });
  }

  /* ---------------------------------- Enlace activo según la sección visible */
  var enlacesNav = $$(".cabecera__enlace");
  var secciones = enlacesNav
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if (secciones.length && "IntersectionObserver" in window) {
    var espia = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        enlacesNav.forEach(function (a) {
          var activo = a.getAttribute("href") === "#" + entrada.target.id;
          a.classList.toggle("activo", activo);
          if (activo) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secciones.forEach(function (s) { espia.observe(s); });
  }

  /* -------------------------------------------- Carruseles sin corte
     Se duplica el contenido una vez; la animación CSS recorre el 50 %.
     La copia es decorativa: fuera del árbol de accesibilidad y del tabulador. */
  function duplicarComoDecoracion(nodo) {
    var copia = nodo.cloneNode(true);
    copia.setAttribute("aria-hidden", "true");
    $$("[tabindex]", copia).forEach(function (el) { el.setAttribute("tabindex", "-1"); });
    copia.removeAttribute("id");
    return copia;
  }

  var pistaTerminos = $(".terminos__pista");
  var grupoTerminos = $(".terminos__grupo");
  if (pistaTerminos && grupoTerminos) {
    pistaTerminos.appendChild(duplicarComoDecoracion(grupoTerminos));
  }

  $$("[data-marquesina]").forEach(function (lista) {
    $$(":scope > li", lista).forEach(function (li) {
      lista.appendChild(duplicarComoDecoracion(li));
    });
  });

  /* ------------------------------------- Nosotros: subrayados que ondulan
     Cada subrayado es una onda senoidal que corre a lo largo del trazo, con
     los extremos casi quietos (como una cuerda). En reposo ondula despacio;
     al pasar el cursor por la palabra (o tocarla) la onda crece, se acelera
     y luego vuelve a la calma. Al entrar la sección llega vibrando.
     Sólo corre mientras Nosotros está a la vista. El trazo original del HTML
     queda para «menos movimiento» y sin JS. */
  var declaracion = $(".nosotros__declaracion");
  var ondas = $$(".resalte__linea path").map(function (path) {
    var vb = path.ownerSVGElement.viewBox.baseVal;
    var n = path.getAttribute("d").match(/-?\d*\.?\d+/g).map(Number);
    return {
      path: path, palabra: path.ownerSVGElement.parentNode, h: vb.height,
      x0: n[0], y0: n[1], x1: n[n.length - 2], y1: n[n.length - 1],
      fase: 0, energia: 1, meta: 0
    };
  });
  if (declaracion && ondas.length && !reducir.matches && "IntersectionObserver" in window) {
    var ondulando = false, ondaPrevia = 0;
    var PUNTOS = 40;

    var ondular = function (t) {
      var dt = Math.min((t - ondaPrevia) / 1000, 1 / 30);
      ondaPrevia = t;
      ondas.forEach(function (o) {
        // la energía sube rápido y baja despacio
        o.energia += (o.meta - o.energia) * Math.min(1, dt * (o.meta > o.energia ? 9 : 1.6));
        var e = o.energia;
        var amplitud = o.h * (.3 + .55 * e);           // 1.8 → 5 unidades en un trazo de 6
        var ciclos = 1 + .7 * e;                        // más ondas cuando está excitada
        o.fase += dt * Math.PI * 2 * (.4 + 1.3 * e);    // .4 → 1.7 vueltas por segundo
        var d = "";
        for (var i = 0; i <= PUNTOS; i++) {
          var u = i / PUNTOS;
          var envolvente = Math.sqrt(Math.sin(Math.PI * u));
          var x = o.x0 + (o.x1 - o.x0) * u;
          var y = o.y0 + (o.y1 - o.y0) * u - amplitud * envolvente * Math.sin(Math.PI * 2 * ciclos * u - o.fase);
          d += (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
        }
        o.path.setAttribute("d", d);
      });
      if (ondulando) requestAnimationFrame(ondular);
    };

    new IntersectionObserver(function (entradas) {
      var visible = entradas[0].isIntersecting;
      if (visible && !ondulando) {
        ondas.forEach(function (o) { o.energia = 1; });   // llega vibrando
        ondulando = true;
        ondaPrevia = performance.now();
        requestAnimationFrame(ondular);
      } else if (!visible) {
        ondulando = false;
      }
    }).observe(declaracion);

    ondas.forEach(function (o) {
      o.palabra.addEventListener("pointerenter", function () { o.meta = 1; });
      o.palabra.addEventListener("pointerleave", function () { o.meta = 0; });
      o.palabra.addEventListener("pointerdown", function () { o.energia = 1; });
    });
  }

  /* ------------------------------------- Servicios: pestañas + acordeón */
  var pestanas = $$('.servicios [role="tab"]');

  function activarPestana(pestana, conFoco) {
    pestanas.forEach(function (p) {
      var sel = p === pestana;
      p.setAttribute("aria-selected", String(sel));
      p.tabIndex = sel ? 0 : -1;
      var panel = document.getElementById(p.getAttribute("aria-controls"));
      if (panel) panel.hidden = !sel;
    });
    if (conFoco) pestana.focus();
  }

  pestanas.forEach(function (p, i) {
    p.addEventListener("click", function () { activarPestana(p); });
    p.addEventListener("keydown", function (e) {
      var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      activarPestana(pestanas[(i + dir + pestanas.length) % pestanas.length], true);
    });
  });

  /* El panel se abre y se cierra animando su altura (y su relleno, margen y
     opacidad) con la Web Animations API. Cerrado sigue siendo [hidden]: fuera
     del tabulador y de los lectores de pantalla. */
  function animarPanel(panel, abrir) {
    var desde = panel._anim ? panel.getBoundingClientRect().height : null;   // a medio camino
    if (panel._anim) { panel._anim.cancel(); panel._anim = null; }
    if (reducir.matches || !panel.animate) { panel.hidden = !abrir; return; }

    panel.hidden = false;
    panel.style.overflow = "hidden";
    var cs = getComputedStyle(panel);
    var abierto = { height: panel.scrollHeight + "px", paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, opacity: 1 };
    var cerrado = { height: "0px", paddingBottom: "0px", marginTop: "0px", opacity: 0 };
    var inicio = abrir ? cerrado : abierto;
    if (desde !== null) inicio = Object.assign({}, inicio, { height: desde + "px" });

    var anim = panel.animate([inicio, abrir ? abierto : cerrado], { duration: 480, easing: "cubic-bezier(.65, 0, .35, 1)" });
    panel._anim = anim;
    anim.onfinish = function () {
      panel._anim = null;
      panel.style.overflow = "";
      if (!abrir) panel.hidden = true;
    };
  }

  function ponerItem(boton, abierto, animar) {
    var item = boton.closest(".acordeon__item");
    var panel = document.getElementById(boton.getAttribute("aria-controls"));
    var estaba = boton.getAttribute("aria-expanded") === "true";
    boton.setAttribute("aria-expanded", String(abierto));
    if (panel) {
      if (animar && estaba !== abierto) animarPanel(panel, abierto);
      else panel.hidden = !abierto;
    }
    if (item) item.classList.toggle("esta-abierto", abierto);
  }

  $$(".acordeon__boton").forEach(function (boton) {
    // Estado inicial desde el HTML (todos cerrados, como en el diseño de 1440).
    ponerItem(boton, boton.getAttribute("aria-expanded") === "true", false);

    boton.addEventListener("click", function () {
      var abrir = boton.getAttribute("aria-expanded") !== "true";
      // Uno abierto a la vez dentro de cada lista, como en el diseño.
      $$(".acordeon__boton", boton.closest(".acordeon")).forEach(function (otro) {
        if (otro !== boton) ponerItem(otro, false, true);
      });
      ponerItem(boton, abrir, true);
    });
  });

  /* --------------------------------------------- Selector: pastilla líquida
     El fondo de la opción elegida es una pastilla clara que fluye de una
     opción a otra. Cada borde va con su resorte: el que avanza es rápido y el
     que se recoge, lento, así que en el camino se estira y al llegar se
     recoge con un pequeño rebote. Al pasar el cursor por otra opción, la
     pastilla se estira hacia el cursor y pasa por detrás de esa palabra; el
     borde que se estira se redondea como una gota.
     La pastilla va encima de las etiquetas y lleva dentro una copia oscura de
     ellas: las letras que cubre se ven negras sobre blanco y las demás siguen
     claras. Sigue a aria-selected / aria-pressed, lo cambie quien lo cambie. */
  $$(".interruptor").forEach(function (grupo) {
    var opciones = $$(".interruptor__opcion", grupo);
    if (!opciones.length) return;
    var pastilla = document.createElement("span");
    pastilla.className = "interruptor__pastilla";
    pastilla.setAttribute("aria-hidden", "true");
    var calcos = opciones.map(function () {
      var c = document.createElement("span");
      c.className = "interruptor__calco";
      return pastilla.appendChild(c);
    });
    grupo.appendChild(pastilla);

    var cajas = [], ancho = 0, alto = 0;      // geometría medida (px, desde el borde interior del grupo)
    var L = null, R = null, vL = 0, vR = 0;   // bordes de la pastilla y su velocidad
    var hacia = null, cursorX = 0, corriendo = false, previo = 0;

    var elegida = function () {
      var i = opciones.findIndex(function (o) {
        return o.getAttribute("aria-selected") === "true" || o.getAttribute("aria-pressed") === "true";
      });
      return i < 0 ? 0 : i;
    };
    var medir = function () {
      var g = grupo.getBoundingClientRect();
      if (!g.width) return false;                       // grupo oculto (otro tramo)
      var x0 = g.left + grupo.clientLeft, y0 = g.top + grupo.clientTop;
      ancho = grupo.clientWidth; alto = grupo.clientHeight;
      cajas = opciones.map(function (o, i) {
        var r = o.getBoundingClientRect();
        var c = { a: r.left - x0, b: r.right - x0, t: r.top - y0, h: r.height };
        var s = calcos[i].style;
        calcos[i].innerHTML = o.innerHTML;              // por si cambió el número del filtro
        s.left = c.a + "px"; s.top = c.t + "px"; s.width = (c.b - c.a) + "px"; s.height = c.h + "px";
        return c;
      });
      return true;
    };
    // a dónde van los bordes: la opción elegida, estirada hacia el cursor si está en otra
    var metas = function () {
      var i = elegida(), c = cajas[i], a = c.a, b = c.b;
      var j = hacia === null || reducir.matches ? -1 : hacia;
      if (j >= 0 && j !== i) {
        var h = cajas[j], w = h.b - h.a;
        if (j > i) b = Math.min(Math.max(cursorX + 12, h.a + w * .4), h.b - w * .08);
        else a = Math.max(Math.min(cursorX - 12, h.b - w * .4), h.a + w * .08);
      }
      return [a, b, c];
    };
    var pintar = function (c) {
      var base = c.b - c.a, radio = 4, medio = c.h / 2;
      // se adelgaza un poco al estirarse (el volumen se conserva)
      var aplasta = Math.min(Math.max((R - L) / base - 1, 0) * c.h * .1, c.h * .12);
      var redondo = function (v, fuera) { return radio + (medio - aplasta - radio) * Math.min(1, Math.max(Math.abs(v) / 900, fuera / 28)); };
      var rL = redondo(vL, c.a - L), rR = redondo(vR, R - c.b);
      var t = c.t + aplasta, abajo = alto - c.t - c.h + aplasta;
      pastilla.style.clipPath = "inset(" + t.toFixed(2) + "px " + (ancho - R).toFixed(2) + "px " + abajo.toFixed(2) + "px " + L.toFixed(2) + "px round " +
        rL.toFixed(2) + "px " + rR.toFixed(2) + "px " + rR.toFixed(2) + "px " + rL.toFixed(2) + "px)";
    };
    var resorte = function (x, v, meta, sale, dt) {
      var k = sale ? 430 : 170, z = sale ? .58 : .78;   // el borde que avanza es más rápido y rebota un poco
      v += (k * (meta - x) - 2 * z * Math.sqrt(k) * v) * dt;
      return [x + v * dt, v];
    };
    var cuadro = function (t) {
      var dt = Math.min((t - previo) / 1000, 1 / 30);
      previo = t;
      var m = metas(), l = resorte(L, vL, m[0], m[0] < L, dt), r = resorte(R, vR, m[1], m[1] > R, dt);
      L = l[0]; vL = l[1]; R = r[0]; vR = r[1];
      if (Math.abs(m[0] - L) + Math.abs(m[1] - R) < .2 && Math.abs(vL) + Math.abs(vR) < 2) {
        L = m[0]; R = m[1]; vL = vR = 0; corriendo = false;
      }
      pintar(m[2]);
      if (corriendo) requestAnimationFrame(cuadro);
    };
    var llevar = function (salto) {
      if (!cajas.length && !medir()) return;
      var m = metas();
      if (L === null || salto || reducir.matches) {
        L = m[0]; R = m[1]; vL = vR = 0;
        pintar(m[2]);
        return;
      }
      if (!corriendo) {
        corriendo = true;
        previo = performance.now();
        requestAnimationFrame(cuadro);
      }
    };
    var remedir = function () { if (medir()) llevar(true); };

    opciones.forEach(function (o, i) {
      var apuntar = function (e) {
        if (e.pointerType !== "mouse") return;
        hacia = i;
        cursorX = e.clientX - grupo.getBoundingClientRect().left - grupo.clientLeft;
        llevar();
      };
      o.addEventListener("pointerenter", apuntar);
      o.addEventListener("pointermove", apuntar);
      o.addEventListener("pointerleave", function () { hacia = null; llevar(); });
      o.addEventListener("click", function () { hacia = null; });
    });
    new MutationObserver(function () { llevar(); }).observe(grupo, { subtree: true, attributes: true, attributeFilter: ["aria-selected", "aria-pressed"] });
    window.addEventListener("resize", remedir);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remedir);
    remedir();
    grupo.classList.add("con-pastilla");
  });

  /* «Solicitar consulta» deja anotado el servicio y lo propone en el mensaje. */
  var campoServicio = $("#campo-servicio");
  var campoProyecto = $("#proyecto");
  $$("[data-servicio]").forEach(function (cta) {
    cta.addEventListener("click", function () {
      var servicio = cta.getAttribute("data-servicio");
      if (campoServicio) campoServicio.value = servicio;
      if (campoProyecto && !campoProyecto.value.trim()) {
        campoProyecto.value = "Me interesa: " + servicio + ".\n";
      }
    });
  });

  /* ------------------------------------------------------------- Proceso
     Escritorio (desde 900 px): un escenario fijo de una pantalla dentro de
     una sección de cuatro (.en-escena). Una sola línea recorre el proceso
     como un «trim»: crece por delante y se borra por detrás, y una «cámara»
     la sigue hacia abajo mientras el fondo pasa del rojo al azul. La línea
     se estaciona en cada etapa: su punto aparece con un rebote (y late
     mientras está ahí) y el texto entra desde la derecha. Al llegar a la
     sección la línea sale sola del titular hasta la etapa 1; las demás van
     con el scroll, y con el scroll por pantallas un gesto = una etapa.
     Referencia: el video del proceso (oct. 2026).
     Móvil: la curva se descubre con el scroll y los puntos se encienden. */
  var proceso = $(".proceso");
  var via = $(".proceso__via");
  var etapas = $$(".etapa");
  var puntos = $$(".proceso__punto");
  var escena = window.matchMedia("(min-width: 56.25em)");

  /* ---- Móvil */
  function curvaVisible() {
    return $$(".proceso__curva-img", via).filter(function (img) { return img.offsetParent !== null || img.getClientRects().length; })[0];
  }

  function pintarProcesoMovil() {
    var alto = window.innerHeight;
    var disparo = alto * 0.62;

    if (reducir.matches) {
      via.style.setProperty("--revelado", "1");
      puntos.forEach(function (p) { p.classList.add("alcanzado"); });
      return;
    }

    var curva = curvaVisible();
    if (curva) {
      var r = curva.getBoundingClientRect();
      var avance = (disparo - r.top) / r.height;
      via.style.setProperty("--revelado", Math.max(0, Math.min(1, avance)).toFixed(4));
    }

    puntos.forEach(function (p) {
      var rp = p.getBoundingClientRect();
      p.classList.toggle("alcanzado", rp.top + rp.height / 2 <= disparo);
    });
  }

  /* ---- Escritorio: el escenario */
  var bloqueProceso = $(".proceso__bloque");
  var camara = $(".proceso__camara");
  var trazo = $(".proceso__trazo");
  var tituloProceso = $(".proceso .titulo-doble > :first-child");
  // fondo por estado: inicio, etapa 1, etapa 2, etapa 3, salida (arriba / abajo)
  var COLORES = [["#c30041", "#b10058"], ["#c30041", "#b10058"], ["#81008d", "#6f00a4"], ["#4400d4", "#3100ec"], ["#4400d4", "#3100ec"]];
  var ALTURA_PUNTO = [.503, .503, .677];       // dónde se estaciona cada punto (fracción de la pantalla)
  var geo = null;                               // geometría de la línea para el tamaño actual
  var fActual = null, persiguiendo = false, ultimoCuadro = 0, llegada = 0;

  var rango = function (v, a, b) { return Math.min(Math.max((v - a) / (b - a), 0), 1); };
  var suave = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var curva = function (p) { return p * p * (3 - 2 * p); };          // smoothstep
  var mezclar = function (a, b, t) { return a + (b - a) * t; };
  var hexARgb = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); };
  var mezclarColor = function (a, b, t) {
    var x = hexARgb(a), y = hexARgb(b);
    return "rgb(" + x.map(function (v, i) { return Math.round(mezclar(v, y[i], t)); }).join(", ") + ")";
  };

  // punto y largo de una curva cúbica [p0, p1, p2, p3]
  function enCubica(c, t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
    return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]];
  }
  function largoCubica(c) {
    var l = 0, p = c[0];
    for (var i = 1; i <= 48; i++) {
      var q = enCubica(c, i / 48);
      l += Math.sqrt((q[0] - p[0]) * (q[0] - p[0]) + (q[1] - p[1]) * (q[1] - p[1]));
      p = q;
    }
    return l;
  }
  function posicionEn(el, ancestro) {
    var x = 0, y = 0;
    while (el && el !== ancestro) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return [x, y];
  }

  /* La línea es un solo camino «en el mundo»: sale de «idea», baja en arco
     hasta el punto 1 y sigue en ondas (punto a la derecha, vuelta a la
     izquierda, punto…). Los puntos son los extremos derechos de la onda. */
  function medirEscena() {
    var W = bloqueProceso.clientWidth, H = bloqueProceso.clientHeight;
    if (!W || !tituloProceso) return null;
    var rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    var pos = posicionEn(tituloProceso, bloqueProceso);
    var fs = parseFloat(getComputedStyle(tituloProceso).fontSize);
    var inicio = [pos[0] + tituloProceso.offsetWidth - .12 * fs, pos[1] + .3 * tituloProceso.offsetHeight];
    var X = W / 2 + 5.6875 * rem;                 // columna de los puntos
    var vaiven = .2 * W;                           // cuánto se va la onda a la izquierda
    var y1 = ALTURA_PUNTO[0] * H;
    var tramos = [[inicio, [mezclar(inicio[0], X, .5), inicio[1] - .013 * H], [X, mezclar(inicio[1], y1, .3)], [X, y1]]];
    var medias = [.5, .62, .66, .58, .6, .62, .62];  // largo de cada media onda (en pantallas)
    var y = y1, derecha = true, k = .3642, ys = [y1];
    medias.forEach(function (m) {
      var q = m * H, x0 = derecha ? X : X - vaiven, x1 = derecha ? X - vaiven : X;
      tramos.push([[x0, y], [x0, y + k * q], [x1, y + q - k * q], [x1, y + q]]);
      y += q;
      derecha = !derecha;
      if (derecha) ys.push(y);
    });
    var largos = tramos.map(largoCubica);
    var hasta = function (n) { return largos.slice(0, n).reduce(function (a, b) { return a + b; }, 0); };
    var s = [hasta(1), hasta(3), hasta(5)];        // largo de la línea hasta cada punto
    var cam = [0, 0, ys[1] - ALTURA_PUNTO[1] * H, ys[2] - ALTURA_PUNTO[2] * H];
    cam.push(cam[3] + .4 * H);

    trazo.setAttribute("d", "M" + tramos[0][0].join(" ") + tramos.map(function (c) {
      return "C" + c.slice(1).map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    }).join(""));
    $$(".etapa__titulo", proceso).forEach(function (t, i) {
      etapas[i]._centro = t.offsetTop + t.offsetHeight / 2;
    });
    return {
      W: W, H: H, X: X, rem: rem, ys: ys.slice(0, 3), total: hasta(tramos.length), cam: cam,
      // estados: inicio, etapa 1, etapa 2, etapa 3, salida
      cola:   [0, 0, s[1] - .24 * H, s[2] - .26 * H, s[2] + .12 * H],
      cabeza: [0, s[0] + .2 * H, s[1] + .31 * H, s[2] + .24 * H, s[2] + 1.05 * H]
    };
  }

  // escala del punto k: aparece con rebote al final del tramo que llega a él y se va al empezar el siguiente
  function escalaPunto(k, f) {
    if (f <= k) {
      var x = rango(f - k + 1, .85, 1);
      return x < .55 ? 1.5 * suave(x / .55) : 1.5 - .5 * suave((x - .55) / .45);
    }
    return 1 - rango(f - k, 0, .12);
  }
  // cuánto se ve la etapa k: entra después del punto y sale antes de que la línea arranque
  function verEtapa(k, f) {
    return f <= k ? suave(rango(f - k + 1, .9, 1)) : 1 - suave(rango(f - k, 0, .22));
  }

  /* f: -1 sin dibujar · 0, 1, 2 las etapas · 3 la salida */
  function pintarEscena(f) {
    var g = geo;
    var i = Math.min(Math.floor(f) + 1, 3), u = f + 1 - i;
    /* Tiempos medidos en el video: la cola arranca enseguida y va casi
       pareja; la cabeza arranca más lenta (la línea se acorta un poco al
       bajar hacia la izquierda); la cámara empieza a un cuarto del tramo.
       Todo llega a la vez (87,5 %); después aparecen el punto y el texto. */
    var tTramo = rango(u, 0, .875);
    var tCola = .5 * tTramo + .5 * curva(tTramo), tCabeza = curva(tTramo);
    var tCam = curva(rango(u, .25, .875)), tColor = suave(rango(u, .3, 1));
    var cola = mezclar(g.cola[i], g.cola[i + 1], tCola);
    var cabeza = mezclar(g.cabeza[i], g.cabeza[i + 1], tCabeza);
    var cam = mezclar(g.cam[i], g.cam[i + 1], tCam);

    var visible = cabeza - cola;
    trazo.style.visibility = visible > .5 ? "visible" : "hidden";
    trazo.style.strokeDasharray = visible.toFixed(1) + " " + Math.ceil(g.total + 10);
    trazo.style.strokeDashoffset = (-cola).toFixed(1);
    camara.setAttribute("transform", "translate(0 " + (-cam).toFixed(1) + ")");

    var arriba = mezclarColor(COLORES[i][0], COLORES[i + 1][0], tColor);
    var abajo = mezclarColor(COLORES[i][1], COLORES[i + 1][1], tColor);
    bloqueProceso.style.background = "linear-gradient(180deg, " + arriba + ", " + abajo + ")";

    puntos.forEach(function (p, k) {
      var e = escalaPunto(k, f);
      p.style.transform = "translate(" + g.X.toFixed(1) + "px, " + (g.ys[k] - cam).toFixed(1) + "px) scale(" + e.toFixed(3) + ")";
      p.classList.toggle("latiendo", f === k);
    });
    etapas.forEach(function (et, k) {
      var v = verEtapa(k, f);
      et.style.opacity = v.toFixed(3);
      et.style.transform = "translate(" + ((1 - v) * 4 * g.rem).toFixed(1) + "px, " + (ALTURA_PUNTO[k] * g.H - et._centro).toFixed(1) + "px)";
    });
  }

  // avance del scroll dentro de la sección: 0 = etapa 1 … 3 = salida
  function avanceScroll() {
    var tramo = (proceso.offsetHeight - window.innerHeight) / 3;
    return tramo > 0 ? -proceso.getBoundingClientRect().top / tramo : 0;
  }
  /* Con scroll libre cada etapa tiene una pausa (15 % antes y después) para
     que la línea se quede estacionada; con el scroll por pantallas no hace
     falta: se para justo en la etapa. */
  function conPausas(p) {
    if (modoPantallas.matches) return p;
    var k = Math.floor(p), h = .3;
    return k + rango(p - k, h / 2, 1 - h / 2);
  }

  /* A dónde tiene que ir la animación según el scroll. Antes de llegar la
     línea no está (-1); al llegar (la sección casi arriba) y tras una pausa
     corta para que entre el titular, sale de él hasta la etapa 1 (0). */
  function metaProceso() {
    var r = proceso.getBoundingClientRect(), alto = window.innerHeight, p = avanceScroll();
    var llego = r.top <= alto * .1, ahora = performance.now();
    if (!llego) llegada = 0;
    else if (!llegada) { llegada = ahora; setTimeout(pedirProceso, 420); }
    var meta = p > .02 ? conPausas(Math.min(p, 3)) : (llego && ahora - llegada >= 400 ? 0 : -1);
    if (reducir.matches) meta = Math.max(0, Math.min(2, Math.round(p)));   // sin movimiento: salta de etapa en etapa
    if (Math.abs(meta - Math.round(meta)) < .01) meta = Math.round(meta);
    return { meta: meta, fuera: r.top >= alto || r.bottom <= 0 };
  }

  /* La animación no va pegada al scroll: un cabezal la lleva hacia la meta a
     su propio ritmo (como en el video: unos 3,4 s de etapa a etapa, 2,2 s el
     dibujo inicial y más rápido la salida), y acelera si se queda atrás. */
  function perseguir(t) {
    var dt = Math.min((t - ultimoCuadro) / 1000, .05);
    ultimoCuadro = t;
    var o = metaProceso();
    if (o.fuera || reducir.matches || !geo) { fActual = o.meta; persiguiendo = false; if (geo) pintarEscena(fActual); return; }
    var d = o.meta - fActual;
    var vel = fActual < 0 ? 1 / 2.2 : (fActual >= 2 && o.meta > 2) || fActual > 2 ? 1 / 1.1 : 1 / 3.4;
    var paso = vel * Math.max(1, Math.abs(d)) * dt;
    fActual = Math.abs(d) <= paso ? o.meta : fActual + (d > 0 ? paso : -paso);
    pintarEscena(fActual);
    if (fActual !== o.meta) requestAnimationFrame(perseguir);
    else persiguiendo = false;
  }

  function pintarProceso() {
    if (!proceso) return;
    if (!escena.matches) { pintarProcesoMovil(); return; }
    if (!geo) geo = medirEscena();
    if (!geo) return;
    var o = metaProceso();
    // fuera de la vista no hace falta animar: se pone directo
    if (fActual === null || o.fuera || reducir.matches) fActual = o.meta;
    pintarEscena(fActual);
    if (fActual !== o.meta && !persiguiendo) {
      persiguiendo = true;
      ultimoCuadro = performance.now();
      requestAnimationFrame(perseguir);
    }
  }

  var procesoPendiente = false;
  function pedirProceso() {
    if (procesoPendiente) return;
    procesoPendiente = true;
    window.requestAnimationFrame(function () { procesoPendiente = false; pintarProceso(); });
  }

  function ponerEscena() {
    if (!proceso) return;
    var en = escena.matches;
    proceso.classList.toggle("en-escena", en);
    geo = null;
    if (!en) {
      // vuelve a la versión móvil: sin estilos del escenario
      bloqueProceso.style.background = "";
      puntos.forEach(function (p) { p.style.transform = ""; p.classList.remove("latiendo"); });
      etapas.forEach(function (et) { et.style.opacity = ""; et.style.transform = ""; });
    }
    pintarProceso();
  }

  /* El scroll por pantallas para en cada etapa: la sección le dice dónde. */
  if (proceso) {
    proceso._paradas = function () {
      if (!escena.matches) return null;
      var tramo = (proceso.offsetHeight - window.innerHeight) / 3;
      return [tramo, 2 * tramo];
    };
  }

  if (via && proceso) {
    window.addEventListener("scroll", pedirProceso, { passive: true });
    window.addEventListener("resize", function () { geo = null; pedirProceso(); });
    escena.addEventListener("change", ponerEscena);
    reducir.addEventListener("change", pedirProceso);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { geo = null; pedirProceso(); });
    ponerEscena();
  }

  /* ------------------------------------------ Clientes: retrato al pasar
     El nombre se pone amarillo y los demás se disuelven. El retrato aparece
     donde el cursor toca el nombre y lo sigue con un poco de inercia (o, con
     el teclado, sobre el nombre enfocado).
     Artistas y disqueras van unidos por data-sello: con un artista se
     resalta también su disquera, y con una disquera, sus artistas (todas
     las copias de la marquesina, así que se ven los que estén a la vista). */
  var filas = $(".clientes__filas");
  var foto = $(".clientes__foto");

  if (filas && foto) {
    var activo = null, salida = 0;
    var meta = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, siguiendo = 0;

    // el retrato queda centrado sobre la punta del cursor, apenas arriba
    var colocarEn = function (x, y) {
      var lado = foto.offsetWidth || 80;
      meta.x = x - lado / 2;
      meta.y = y - lado * .9;
    };
    var pintar = function () {
      foto.style.translate = pos.x.toFixed(1) + "px " + pos.y.toFixed(1) + "px";
    };
    var seguir = function () {
      pos.x += (meta.x - pos.x) * .2;
      pos.y += (meta.y - pos.y) * .2;
      pintar();
      siguiendo = (activo || Math.abs(meta.x - pos.x) + Math.abs(meta.y - pos.y) > .5) ? requestAnimationFrame(seguir) : 0;
    };

    var relacionar = function (nombre) {
      var sello = nombre && nombre.getAttribute("data-sello");
      $$(".nombre-cliente", filas).forEach(function (n) {
        n.classList.toggle("relacionado", !!sello && n !== nombre && n.getAttribute("data-sello") === sello &&
          n.closest(".fila-clientes") !== nombre.closest(".fila-clientes"));
      });
    };

    var arrastrando = false;
    var mostrarFoto = function (nombre, x, y) {
      var src = nombre.getAttribute("data-foto");
      if (!escritorio.matches || arrastrando) return;
      clearTimeout(salida);
      var aparece = !activo;
      if (activo && activo !== nombre) activo.classList.remove("activo");
      activo = nombre;
      nombre.classList.add("activo");
      relacionar(nombre);
      filas.classList.add("con-foco");
      if (!src) { foto.classList.remove("visible"); return; }
      if (foto.getAttribute("src") !== src) foto.setAttribute("src", src);
      foto.alt = "";
      foto.hidden = false;
      colocarEn(x, y);
      if (aparece) { pos.x = meta.x; pos.y = meta.y; pintar(); }   // nace donde está el cursor
      foto.classList.add("visible");
      if (!siguiendo) siguiendo = requestAnimationFrame(seguir);
    };

    var ocultarFoto = function (nombre) {
      if (nombre && nombre !== activo) return;
      if (activo) activo.classList.remove("activo");
      activo = null;
      relacionar(null);
      filas.classList.remove("con-foco");
      foto.classList.remove("visible");
    };

    var relativo = function (e) {
      var cf = filas.getBoundingClientRect();
      return { x: e.clientX - cf.left, y: e.clientY - cf.top };
    };

    $$(".nombre-cliente", filas).forEach(function (nombre) {
      nombre.addEventListener("pointerenter", function (e) { var p = relativo(e); mostrarFoto(nombre, p.x, p.y); });
      // margen de 140 ms: si el cursor llega a otro nombre, el retrato se desliza hasta él
      nombre.addEventListener("pointerleave", function () { salida = setTimeout(function () { ocultarFoto(nombre); }, 140); });
      nombre.addEventListener("focus", function () {
        var cf = filas.getBoundingClientRect(), rn = nombre.getBoundingClientRect();
        mostrarFoto(nombre, rn.left - cf.left + rn.width / 2, rn.top - cf.top);
      });
      nombre.addEventListener("blur", function () { ocultarFoto(nombre); });
    });
    filas.addEventListener("pointermove", function (e) {
      if (!activo) return;
      var p = relativo(e);
      colocarEn(p.x, p.y);
    });

    /* La marquesina no se detiene en seco: al entrar el cursor en la fila
       frena (velocidad 1 → 0 en 0.7 s) y al salir vuelve a arrancar. La
       fila de disqueras no se mueve: al entrar en ella frena la de
       artistas, para leer los nombres resaltados. */
    var rampa = function (anim, destino) {
      cancelAnimationFrame(anim._rampa);
      var desde = anim.playbackRate, t0 = performance.now();
      var paso = function (t) {
        var p = Math.min((t - t0) / 700, 1);
        anim.playbackRate = desde + (destino - desde) * (1 - Math.pow(1 - p, 3));
        if (p < 1) anim._rampa = requestAnimationFrame(paso);
      };
      anim._rampa = requestAnimationFrame(paso);
    };
    var marquesinas = $$("[data-marquesina]", filas);
    $$(".fila-clientes", filas).forEach(function (fila) {
      var propia = $("[data-marquesina]", fila);
      var listas = propia ? [propia] : marquesinas;
      if (!listas.length || !listas[0].getAnimations) return;
      var frenar = function (parar) {
        listas.forEach(function (lista) {
          var anim = lista.getAnimations()[0];
          if (anim) rampa(anim, parar ? 0 : 1);
        });
      };
      fila.addEventListener("pointerenter", function () { frenar(true); });
      fila.addEventListener("pointerleave", function () { frenar(false); });
      fila.addEventListener("focusin", function () { frenar(true); });
      fila.addEventListener("focusout", function (e) { if (!fila.contains(e.relatedTarget)) frenar(false); });
    });

    /* Arrastrar la marquesina: con clic sostenido (o el dedo) se lleva a un
       lado o al otro para buscar un nombre, y al soltar sigue un poco por
       inercia. También con el deslizamiento horizontal del trackpad. Mueve
       el tiempo de la animación CSS, así que no corta el bucle. */
    $$("[data-marquesina]", filas).forEach(function (lista) {
      var ventana = lista.parentNode;
      var animDe = function () { return lista.getAnimations && lista.getAnimations()[0]; };
      var correr = function (dx) {
        var anim = animDe(), mitad = lista.offsetWidth / 2;
        if (!anim || !mitad) return;
        var dur = anim.effect.getComputedTiming().duration;
        var t = ((anim.currentTime || 0) - dx / mitad * dur) % dur;
        anim.currentTime = t < 0 ? t + dur : t;
      };
      var toma = null, inercia = 0;

      ventana.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        cancelAnimationFrame(inercia);
        toma = { id: e.pointerId, x: e.clientX, ultimo: e.clientX, t: performance.now(), v: 0, movio: false };
      });
      ventana.addEventListener("pointermove", function (e) {
        if (!toma || e.pointerId !== toma.id) return;
        var dx = e.clientX - toma.ultimo, ahora = performance.now();
        if (!toma.movio) {
          if (Math.abs(e.clientX - toma.x) < 5) return;    // un clic no es un arrastre
          toma.movio = true;
          arrastrando = true;
          ocultarFoto();
          filas.classList.add("arrastrando");
          try { ventana.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
        }
        correr(dx);
        var dt = Math.max(ahora - toma.t, 1);
        toma.v = toma.v * .7 + (dx / dt) * .3;              // px por ms, suavizada
        toma.ultimo = e.clientX;
        toma.t = ahora;
      });
      var soltar = function (e) {
        if (!toma || (e && e.pointerId !== toma.id)) return;
        var v = toma.movio ? toma.v : 0;
        toma = null;
        arrastrando = false;
        filas.classList.remove("arrastrando");
        if (reducir.matches || Math.abs(v) < .05) return;
        var antes = performance.now();
        var seguir = function (t) {
          var dt = t - antes;
          antes = t;
          correr(v * dt);
          v *= Math.pow(.94, dt / 16);
          if (Math.abs(v) > .02) inercia = requestAnimationFrame(seguir);
        };
        inercia = requestAnimationFrame(seguir);
      };
      ventana.addEventListener("pointerup", soltar);
      ventana.addEventListener("pointercancel", soltar);
      ventana.addEventListener("lostpointercapture", soltar);
      // el arrastre no selecciona texto ni arrastra imágenes
      ventana.addEventListener("dragstart", function (e) { e.preventDefault(); });

      ventana.addEventListener("wheel", function (e) {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();                                  // sin «atrás» del navegador
        correr(-e.deltaX);
      }, { passive: false });
    });

    // Precarga discreta para que la foto aparezca sin parpadeo.
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(function () {
        $$(".nombre-cliente[data-foto]", filas).forEach(function (n) { new Image().src = n.getAttribute("data-foto"); });
      });
    }
  }

  /* ------------------------------------------ Clientes: filtro en móvil */
  var filtros = $$("[data-filtro]");
  var tarjetas = $$(".tarjeta-cliente");

  function contar(tipo) {
    return tarjetas.filter(function (t) { return tipo === "todo" || t.getAttribute("data-tipo") === tipo; }).length;
  }

  filtros.forEach(function (boton) {
    var tipo = boton.getAttribute("data-filtro");
    var cuenta = $(".interruptor__cuenta", boton);
    if (cuenta) cuenta.textContent = String(contar(tipo)).padStart(2, "0");

    boton.addEventListener("click", function () {
      filtros.forEach(function (b) { b.setAttribute("aria-pressed", String(b === boton)); });
      tarjetas.forEach(function (t) {
        t.hidden = !(tipo === "todo" || t.getAttribute("data-tipo") === tipo);
      });
    });
  });

  /* --------------------------------------------- Formulario: redes sociales */
  var listaRedes = $("#redes-lista");
  var agregarRed = $("#redes-agregar");

  /* Empiezan vacías (diseño): las cinco filas fijas están en el HTML pero
     ocultas, y «Agregar» las va mostrando en orden: Instagram, Facebook, X,
     YouTube, Otra. Con las cinco a la vista, agrega más filas «Otra». */
  if (listaRedes && agregarRed) {
    var visibles = function () { return $$(".red:not([hidden])", listaRedes); };

    listaRedes.addEventListener("click", function (e) {
      var quitar = e.target.closest(".red__quitar");
      if (!quitar) return;
      var fila = quitar.closest(".red");
      var lista = visibles();
      var i = lista.indexOf(fila);
      var siguiente = lista[i + 1] || lista[i - 1];
      if (fila.hasAttribute("data-fija")) {
        $(".red__entrada", fila).value = "";
        fila.hidden = true;
      } else {
        fila.remove();
      }
      (siguiente ? $(".red__entrada", siguiente) : agregarRed).focus();
    });

    agregarRed.addEventListener("click", function () {
      var oculta = $(".red[data-fija][hidden]", listaRedes);
      if (oculta) {
        oculta.hidden = false;
        $(".red__entrada", oculta).focus();
        return;
      }
      var n = $$(".red", listaRedes).length + 1;
      var li = document.createElement("li");
      li.className = "red";
      li.setAttribute("data-red", "Otra");
      li.innerHTML =
        '<span class="red__icono red__icono--texto">Otra</span>' +
        '<input class="red__entrada" type="text" placeholder="www." autocomplete="off">' +
        '<button class="red__quitar" type="button" aria-label="Quitar esta red">' +
        '<img src="assets/v2/icon-basura.svg" alt="" width="24" height="24"></button>';
      $(".red__entrada", li).setAttribute("aria-label", "Otra red o sitio web " + n);
      listaRedes.appendChild(li);
      $(".red__entrada", li).focus();
    });
  }

  /* -------------------------------------------------- Formulario: envío
     Netlify Forms detecta el formulario en el HTML publicado. Las filas de
     redes que se agregan en el navegador no existen en ese HTML, así que
     todas las redes se mandan además juntas en el campo oculto «redes». */
  var formulario = $("#formulario");
  var estado = $("#formulario-estado");
  var campoRedes = $("#campo-redes");

  function marcarErrores() {
    var primero = null;
    $$(".campo", formulario).forEach(function (campo) {
      var entrada = $(".campo__entrada", campo);
      var malo = entrada && !entrada.checkValidity();
      campo.classList.toggle("con-error", !!malo);
      if (malo && !primero) primero = entrada;
    });
    return primero;
  }

  if (formulario && estado) {
    // Con JS validamos nosotros (mensajes y estado de error del diseño);
    // sin JS se queda la validación nativa del navegador.
    formulario.noValidate = true;

    formulario.addEventListener("input", function (e) {
      var campo = e.target.closest(".campo");
      if (campo && campo.classList.contains("con-error") && e.target.checkValidity()) {
        campo.classList.remove("con-error");
      }
    });

    formulario.addEventListener("submit", function (e) {
      e.preventDefault();

      var invalido = marcarErrores();
      if (invalido) {
        estado.setAttribute("data-estado", "error");
        estado.textContent = invalido.validationMessage || "Revisa los campos marcados.";
        invalido.focus();
        return;
      }

      if (campoRedes && listaRedes) {
        campoRedes.value = $$(".red:not([hidden])", listaRedes)
          .map(function (fila) {
            var valor = $(".red__entrada", fila).value.trim();
            return valor ? fila.getAttribute("data-red") + ": " + valor : "";
          })
          .filter(Boolean)
          .join(" · ");
      }

      var enviar = $('button[type="submit"]', formulario);
      var original = enviar ? enviar.innerHTML : "";
      estado.removeAttribute("data-estado");
      estado.textContent = "Enviando…";
      if (enviar) enviar.disabled = true;

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(formulario)).toString()
      })
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          formulario.reset();
          estado.setAttribute("data-estado", "ok");
          estado.textContent = "¡Gracias! Recibimos tu proyecto y te escribimos pronto.";
        })
        .catch(function () {
          estado.setAttribute("data-estado", "error");
          estado.textContent = "No pudimos enviar el formulario. Escríbenos a management@somoselcrew.com";
        })
        .then(function () {
          if (enviar) { enviar.disabled = false; enviar.innerHTML = original; }
        });
    });
  }

  /* ------------------------------------------------ Animaciones de entrada
     Cada [data-entra] recibe .entra la primera vez que asoma en pantalla; el
     CSS hace el resto. Lo que está oculto (otra pestaña, filtro) entra cuando
     se muestra. */
  var porEntrar = $$("[data-entra]");
  if (porEntrar.length) {
    if (reducir.matches || !("IntersectionObserver" in window)) {
      porEntrar.forEach(function (el) { el.classList.add("entra"); });
    } else {
      var vigia = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          entrada.target.classList.add("entra");
          vigia.unobserve(entrada.target);
        });
      }, { rootMargin: "0px 0px -8% 0px" });
      porEntrar.forEach(function (el) { vigia.observe(el); });
    }
  }

  /* ------------------------ La segunda línea del titular se estira con el scroll
     --estira va de 0 a 1 en la primera mitad del hero. Lo que cabe en la
     columna (hasta +35 %) se calcula aparte para la palabra (--estira-max) y
     para el subrayado (--estira-max-sub), que mide lo que la línea más larga. */
  var marcaTitulo = $(".hero__marca-titulo");
  var palabra = marcaTitulo && $(".hero__linea.contorno", marcaTitulo);
  var subrayado = marcaTitulo && $(".hero__subrayado", marcaTitulo);
  var heroSeccion = $(".hero");

  if (marcaTitulo && palabra && subrayado && heroSeccion) {
    var holgura = function (columna, ancho) {
      return Math.max(0, Math.min(.35, ancho ? columna / ancho - 1 : 0)).toFixed(3);
    };
    var medirEstirar = function () {
      var columna = marcaTitulo.parentElement.getBoundingClientRect().width;
      // offsetWidth no incluye la escala aplicada
      marcaTitulo.style.setProperty("--estira-max", holgura(columna, palabra.offsetWidth));
      marcaTitulo.style.setProperty("--estira-max-sub", holgura(columna, subrayado.offsetWidth));
    };
    var esperandoEstirar = false;
    var estirar = function () {
      esperandoEstirar = false;
      var p = window.scrollY / (heroSeccion.offsetHeight * .5);
      marcaTitulo.style.setProperty("--estira", Math.min(Math.max(p, 0), 1).toFixed(3));
    };

    if (!reducir.matches) {
      medirEstirar();
      estirar();
      window.addEventListener("resize", medirEstirar);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirEstirar);
      window.addEventListener("scroll", function () {
        if (!esperandoEstirar) { esperandoEstirar = true; requestAnimationFrame(estirar); }
      }, { passive: true });
    }
  }
})();
