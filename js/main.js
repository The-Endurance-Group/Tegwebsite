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

  /* Free Automation form — placeholder, no backend wired up.
     Replace with a real form handler (e.g. HubSpot Forms embed) when CRM integration is scoped. */
  var form = document.getElementById('automation-form');
  var confirmation = document.getElementById('form-confirmation');

  if (form && confirmation) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      form.hidden = true;
      confirmation.hidden = false;
      confirmation.focus();
    });
  }
});
