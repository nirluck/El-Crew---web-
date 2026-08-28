/* ==========================================================================
   EL CREW — interacciones
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- Año */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ------------------------------------------ Header pegajoso al scroll */
  var header = document.getElementById("site-header");

  if (header) {
    var stuck = false;
    var onScroll = function () {
      var should = window.scrollY > 27;
      if (should !== stuck) {
        stuck = should;
        header.classList.toggle("is-stuck", stuck);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------- Menú móvil */
  var toggle = document.querySelector(".nav__toggle");
  var mobile = document.getElementById("nav-mobile");

  if (toggle && mobile) {
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      mobile.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    mobile.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ------------------------------------------- Revelado al hacer scroll */
  var revealables = document.querySelectorAll("[data-reveal]");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------------------------- Enlace activo según la sección visible */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
  var targets = navLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      return id && id.length > 1 ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if (targets.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle(
            "is-active",
            link.getAttribute("href") === "#" + entry.target.id
          );
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    targets.forEach(function (el) { spy.observe(el); });
  }

  /* ------------------------------------------------------- Formulario */
  var form = document.getElementById("contact-form");
  var status = document.getElementById("form-status");

  if (form && status) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var submit = form.querySelector('button[type="submit"]');
      var original = submit ? submit.textContent : "";

      status.removeAttribute("data-state");
      status.textContent = "Enviando…";
      if (submit) { submit.disabled = true; submit.textContent = "Enviando…"; }

      var done = function (ok, message) {
        status.textContent = message;
        if (!ok) status.setAttribute("data-state", "error");
        if (submit) { submit.disabled = false; submit.textContent = original; }
      };

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString()
      })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          form.reset();
          done(true, "¡Gracias! Recibimos tu mensaje y te contactamos pronto.");
        })
        .catch(function () {
          done(false, "No pudimos enviar el mensaje. Escríbenos a management@somoselcrew.com");
        });
    });
  }
})();
