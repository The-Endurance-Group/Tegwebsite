(function () {
  var embeds = document.querySelectorAll('.video-embed[data-gated]');
  if (!embeds.length) return;
  function unlocked() { try { return localStorage.getItem('teg_video_email'); } catch (e) { return null; } }
  embeds.forEach(function (embed) {
    var v = embed.querySelector('video');
    var gate = embed.querySelector('.video-gate');
    var form = embed.querySelector('form');
    var input = form.querySelector('input');
    var btn = form.querySelector('button');
    var err = embed.querySelector('.video-gate-error');
    function unlock() {
      gate.style.display = 'none';
      v.style.display = 'block';
      v.src = v.getAttribute('data-src');
      v.load();
    }
    // The server refuses the video once its access cookie is gone, even if
    // localStorage still says unlocked. Forget the stale unlock and ask again.
    v.addEventListener('error', function () {
      var src = v.getAttribute('src');
      if (!src) return;
      fetch(src, { headers: { Range: 'bytes=0-0' } }).then(function (r) {
        if (r.status !== 403) return;
        try { localStorage.removeItem('teg_video_email'); } catch (e) {}
        v.removeAttribute('src');
        v.style.display = 'none';
        gate.style.display = '';
        btn.disabled = false; btn.textContent = 'Watch the video';
      }).catch(function () {});
    });
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
        unlock();
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Watch the video'; err.style.display = 'block';
      });
    });
    if (unlocked()) unlock();
  });
}());
