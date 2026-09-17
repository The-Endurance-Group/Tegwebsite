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


  /* Scroll reveal - fade/slide sections in as they enter the viewport.
     Falls back to visible-by-default if IntersectionObserver is missing or
     the user prefers reduced motion. */
  var reveals = document.querySelectorAll('.reveal');
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reveals.length) {
    if (prefersReduced || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  /* Post scroller - lets desktop visitors use vertical wheel/trackpad input
     to drive horizontal scroll, plus click-to-page arrow buttons. */
  document.querySelectorAll('.post-scroller').forEach(function (scroller) {
    scroller.addEventListener('wheel', function (event) {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      scroller.scrollLeft += event.deltaY;
    }, { passive: false });
  });

  document.querySelectorAll('[data-scroll-target]').forEach(function (button) {
    button.addEventListener('click', function () {
      var target = document.getElementById(button.getAttribute('data-scroll-target'));
      if (!target) return;
      var dir = button.classList.contains('post-scroller-nav--prev') ? -1 : 1;
      var card = target.querySelector('.post-scroller-card');
      var step = card ? card.getBoundingClientRect().width + 20 : 280;
      target.scrollBy({ left: dir * step, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });

  /* Industry switcher - pill tabs (desktop) + native select (mobile) drive
     which industry panel is shown. Deep links like #technology still work. */
  var switcher = document.querySelector('.industry-switcher');
  if (switcher) {
    var tabs = Array.prototype.slice.call(switcher.querySelectorAll('.industry-tab'));
    var select = switcher.querySelector('.industry-select');
    var panels = Array.prototype.slice.call(document.querySelectorAll('.industry-panel'));
    var isMobileView = function () { return window.matchMedia('(max-width: 767px)').matches; };

    var activateIndustry = function (id, focusTab) {
      panels.forEach(function (panel) {
        // On mobile every panel stays visible (stacked); tabs are hidden there.
        panel.hidden = isMobileView() ? false : (panel.id !== id);
      });
      tabs.forEach(function (tab) {
        var selected = tab.getAttribute('data-target') === id;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focusTab) tab.focus();
      });
      if (select && select.value !== id) select.value = id;
    };

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-target');
        activateIndustry(id, false);
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
      // Arrow-key navigation across the tablist.
      tab.addEventListener('keydown', function (event) {
        var dir = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        event.preventDefault();
        var next = tabs[(i + dir + tabs.length) % tabs.length];
        activateIndustry(next.getAttribute('data-target'), true);
      });
    });

    if (select) {
      select.addEventListener('change', function () {
        activateIndustry(select.value, false);
        var target = document.getElementById(select.value);
        if (target) target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
      });
    }

    // Re-evaluate panel visibility when crossing the mobile/desktop boundary.
    window.addEventListener('resize', function () {
      var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      activateIndustry(current ? current.getAttribute('data-target') : panels[0].id, false);
    });

    // Honor a deep link on load, otherwise default to the first industry.
    var initial = (location.hash && document.getElementById(location.hash.slice(1)) &&
                   document.getElementById(location.hash.slice(1)).classList.contains('industry-panel'))
                  ? location.hash.slice(1)
                  : (tabs[0] && tabs[0].getAttribute('data-target'));
    if (initial) activateIndustry(initial, false);
  }

  /* AI chat widget - same-origin to /api/chat, built into the DOM here so
     every page picks it up without touching 27 HTML files individually. */
  var widget = document.createElement('div');
  widget.className = 'ai-chat-widget';
  widget.innerHTML =
    '<button type="button" class="ai-chat-toggle" aria-label="Open chat" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/></svg>' +
    '</button>' +
    '<div class="ai-chat-panel" hidden>' +
      '<div class="ai-chat-header">' +
        '<span>Ask The Endurance Group</span>' +
        '<button type="button" class="ai-chat-close" aria-label="Close chat">&times;</button>' +
      '</div>' +
      '<div class="ai-chat-messages" role="log" aria-live="polite"></div>' +
      '<form class="ai-chat-form">' +
        '<input type="text" class="ai-chat-input" placeholder="Ask a question…" aria-label="Message" autocomplete="off" required>' +
        '<button type="submit" class="ai-chat-send">Send</button>' +
      '</form>' +
    '</div>';
  document.body.appendChild(widget);

  var chatToggle = widget.querySelector('.ai-chat-toggle');
  var chatPanel = widget.querySelector('.ai-chat-panel');
  var chatClose = widget.querySelector('.ai-chat-close');
  var chatMessages = widget.querySelector('.ai-chat-messages');
  var chatForm = widget.querySelector('.ai-chat-form');
  var chatInput = widget.querySelector('.ai-chat-input');
  var chatHistory = [];
  var chatGreeted = false;

  function escapeHtml(text) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return text.replace(/[&<>"']/g, function (c) { return map[c]; });
  }

  function formatChatText(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function appendChatMessage(role, text, animate) {
    var bubble = document.createElement('div');
    bubble.className = 'ai-chat-message ai-chat-message--' + role;
    if (role === 'assistant' && animate && text) {
      var i = 0;
      var interval = setInterval(function () {
        i++;
        bubble.textContent = text.slice(0, i);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (i >= text.length) {
          clearInterval(interval);
          bubble.innerHTML = formatChatText(text);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      }, 14);
    } else if (role === 'assistant') {
      bubble.innerHTML = formatChatText(text);
    } else {
      bubble.textContent = text;
    }
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
  }

  function openChat() {
    chatPanel.hidden = false;
    chatToggle.setAttribute('aria-expanded', 'true');
    if (!chatGreeted) {
      chatGreeted = true;
      appendChatMessage('assistant', "Hi! I can answer questions about The Endurance Group, what we build, and how pricing works. Ask away, or schedule a call anytime.", true);
    }
    chatInput.focus();
  }

  function closeChat() {
    chatPanel.hidden = true;
    chatToggle.setAttribute('aria-expanded', 'false');
  }

  chatToggle.addEventListener('click', function () {
    if (chatPanel.hidden) openChat(); else closeChat();
  });
  chatClose.addEventListener('click', closeChat);

  chatForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    appendChatMessage('user', text);
    chatHistory.push({ role: 'user', content: text });

    var pending = appendChatMessage('assistant', '…');
    pending.classList.add('ai-chat-message--pending');

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory }),
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Request failed');
        return response.json();
      })
      .then(function (data) {
        pending.remove();
        appendChatMessage('assistant', data.reply, true);
        chatHistory.push({ role: 'assistant', content: data.reply });
      })
      .catch(function () {
        pending.remove();
        appendChatMessage('assistant', 'Sorry, something went wrong. Try again, or email us at csullivan@theendurancegroup.com.');
      });
  });
});

/* ===== Hero video: autoplay + custom controls (TEG palette) ===== */
(function () {
  var frame = document.getElementById('heroVideo');
  if (!frame) return;
  var video = frame.querySelector('.hero-video__el');
  if (!video) return;

  var bigToggle = frame.querySelector('.hero-video__toggle');
  var playBtn = frame.querySelector('.hvc-play');
  var muteBtn = frame.querySelector('.hvc-mute');
  var fsBtn = frame.querySelector('.hvc-fs');
  var progress = frame.querySelector('.hvc-progress');
  var progressFill = frame.querySelector('.hvc-progress__fill');
  var timeLabel = frame.querySelector('.hvc-time');

  var ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
  var ICON_PAUSE = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
  // Speaker + sound waves (unmuted) vs speaker + X (muted)
  var ICON_VOL_ON = '<path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M15.5 8.5a4.5 4.5 0 010 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18 6a8 8 0 010 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  var ICON_VOL_OFF = '<path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  var ICON_EXPAND = '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  var ICON_CLOSE = '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';

  function fmt(t) {
    if (!t || isNaN(t)) t = 0;
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function syncPlayIcons() {
    var paused = video.paused;
    frame.classList.toggle('is-paused', paused);
    if (playBtn) playBtn.querySelector('svg').innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
    if (playBtn) playBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  }

  function syncMuteIcon() {
    var on = !video.muted && video.volume > 0;
    frame.classList.toggle('is-unmuted', on);
    if (muteBtn) {
      muteBtn.querySelector('svg').innerHTML = on ? ICON_VOL_ON : ICON_VOL_OFF;
      muteBtn.setAttribute('aria-label', on ? 'Mute' : 'Unmute');
    }
  }

  function togglePlay() {
    if (video.paused) { video.play(); } else { video.pause(); }
  }

  function toggleMute() {
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 1;
    syncMuteIcon();
  }

  // Custom lightbox: center the video on a dimmed backdrop, keep 9:16 (no
  // native fullscreen, which stretches the portrait video across the screen).
  var backdrop = null;
  function openLightbox() {
    if (frame.classList.contains('is-lightbox')) return;
    backdrop = document.createElement('div');
    backdrop.className = 'hero-video-backdrop';
    backdrop.addEventListener('click', closeLightbox);
    document.body.appendChild(backdrop);
    document.body.classList.add('hero-video-lock');
    frame.classList.add('is-lightbox');
    if (fsBtn) { fsBtn.querySelector('svg').innerHTML = ICON_CLOSE; fsBtn.setAttribute('aria-label', 'Close'); }
    document.addEventListener('keydown', onLightboxKey);
  }
  function closeLightbox() {
    if (!frame.classList.contains('is-lightbox')) return;
    frame.classList.remove('is-lightbox');
    document.body.classList.remove('hero-video-lock');
    if (backdrop) { backdrop.remove(); backdrop = null; }
    if (fsBtn) { fsBtn.querySelector('svg').innerHTML = ICON_EXPAND; fsBtn.setAttribute('aria-label', 'Fullscreen'); }
    document.removeEventListener('keydown', onLightboxKey);
  }
  function onLightboxKey(e) { if (e.key === 'Escape') closeLightbox(); }
  function toggleFs() {
    if (frame.classList.contains('is-lightbox')) closeLightbox();
    else openLightbox();
  }

  function seekFromEvent(e) {
    var rect = progress.getBoundingClientRect();
    var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    var ratio = Math.max(0, Math.min(1, x / rect.width));
    if (video.duration) video.currentTime = ratio * video.duration;
  }

  if (bigToggle) bigToggle.addEventListener('click', togglePlay);
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (muteBtn) muteBtn.addEventListener('click', toggleMute);
  if (fsBtn) fsBtn.addEventListener('click', toggleFs);

  video.addEventListener('play', syncPlayIcons);
  video.addEventListener('pause', syncPlayIcons);
  video.addEventListener('volumechange', syncMuteIcon);
  video.addEventListener('timeupdate', function () {
    var pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    if (progressFill) progressFill.style.width = pct + '%';
    if (progress) progress.setAttribute('aria-valuenow', Math.round(pct));
    if (timeLabel) timeLabel.textContent = fmt(video.currentTime);
  });

  if (progress) {
    var scrubbing = false;
    progress.addEventListener('mousedown', function (e) { scrubbing = true; seekFromEvent(e); });
    document.addEventListener('mousemove', function (e) { if (scrubbing) seekFromEvent(e); });
    document.addEventListener('mouseup', function () { scrubbing = false; });
    progress.addEventListener('click', seekFromEvent);
    progress.addEventListener('touchstart', function (e) { seekFromEvent(e); }, { passive: true });
    progress.addEventListener('touchmove', function (e) { seekFromEvent(e); }, { passive: true });
    progress.addEventListener('keydown', function (e) {
      if (!video.duration) return;
      if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration, video.currentTime + 5); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') { togglePlay(); e.preventDefault(); }
    });
  }

  // Autoplay must start muted; browsers may still block it — reflect real state.
  syncPlayIcons();
  syncMuteIcon();
  var attempt = video.play();
  if (attempt && attempt.catch) { attempt.catch(function () { syncPlayIcons(); }); }
})();
