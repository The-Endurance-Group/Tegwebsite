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

  /* Free Automation form — submits same-origin to /api/free-automation.
     JS-enabled browsers get an AJAX flow; without JS, the server redirects
     back here with ?submitted=true or ?submitted=error. */
  var form = document.getElementById('automation-form');
  var confirmation = document.getElementById('form-confirmation');
  var formError = document.getElementById('form-error');

  if (form && confirmation) {
    var submitted = new URLSearchParams(window.location.search).get('submitted');
    if (submitted === 'true') {
      form.hidden = true;
      confirmation.hidden = false;
      confirmation.focus();
    } else if (submitted === 'error' && formError) {
      formError.hidden = false;
      formError.focus();
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (formError) formError.hidden = true;

      fetch(form.action, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(new FormData(form)).toString(),
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Request failed');
          return response.json();
        })
        .then(function (data) {
          if (!data.ok) throw new Error('Submission failed');
          form.hidden = true;
          confirmation.hidden = false;
          confirmation.focus();
        })
        .catch(function () {
          if (formError) {
            formError.hidden = false;
            formError.focus();
          }
        });
    });
  }
});
