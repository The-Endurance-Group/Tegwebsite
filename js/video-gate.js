(function () {
  var embeds = document.querySelectorAll('.video-embed[data-gated]');
  if (!embeds.length) return;
  function unlock(embed) {
    var v = embed.querySelector('video');
    var gate = embed.querySelector('.video-gate');
    if (gate) gate.style.display = 'none';
    v.style.display = 'block';
    v.src = v.getAttribute('data-src');
    v.load();
  }
  function unlocked() { try { return localStorage.getItem('teg_video_email'); } catch (e) { return null; } }
  embeds.forEach(function (embed) {
    if (unlocked()) { unlock(embed); return; }
    var form = embed.querySelector('form');
    var input = form.querySelector('input');
    var btn = form.querySelector('button');
    var err = embed.querySelector('.video-gate-error');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { input.focus(); return; }
      btn.disabled = true; btn.textContent = 'One moment…'; err.style.display = 'none';
      fetch('/api/video-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, page: location.pathname })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.ok) throw new Error();
        try { localStorage.setItem('teg_video_email', email); } catch (e) {}
        unlock(embed);
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Watch the video'; err.style.display = 'block';
      });
    });
  });
}());
