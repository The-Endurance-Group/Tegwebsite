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

  /* AI chat widget — same-origin to /api/chat, built into the DOM here so
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

  function appendChatMessage(role, text) {
    var bubble = document.createElement('div');
    bubble.className = 'ai-chat-message ai-chat-message--' + role;
    if (role === 'assistant') {
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
      appendChatMessage('assistant', "Hi! I can answer questions about The Endurance Group, what we build, and how pricing works. Ask away, or schedule a call anytime.");
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
        appendChatMessage('assistant', data.reply);
        chatHistory.push({ role: 'assistant', content: data.reply });
      })
      .catch(function () {
        pending.remove();
        appendChatMessage('assistant', 'Sorry, something went wrong. Try again, or email us at csullivan@theendurancegroup.com.');
      });
  });
});
