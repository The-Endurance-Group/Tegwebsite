document.addEventListener('DOMContentLoaded', function () {
  /* Mobile nav toggle */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.primary-nav');

  if (toggle && nav) {
    var closeMenu = function () {
      nav.classList.remove('is-open');
      toggle.classList.remove('is-active');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      toggle.classList.toggle('is-active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('click', function (event) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        closeMenu();
        toggle.focus();
      }
    });
  }

  /* Free Automation form — submits to Formspree, forwards to csullivan@theendurancegroup.com */
  var form = document.getElementById('automation-form');
  var confirmation = document.getElementById('form-confirmation');
  var formError = document.getElementById('form-error');

  if (form && confirmation) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (formError) formError.hidden = true;

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (response) {
          if (response.ok) {
            form.hidden = true;
            confirmation.hidden = false;
            confirmation.focus();
          } else if (formError) {
            formError.hidden = false;
          }
        })
        .catch(function () {
          if (formError) formError.hidden = false;
        });
    });
  }
});
