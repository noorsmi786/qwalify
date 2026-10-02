(function() {
  var script = document.currentScript || document.querySelector('script[data-agent]');
  var agentId = script ? script.getAttribute('data-agent') : '';
  var host = window.location.origin.includes('localhost') ? 'https://qwalify.online' : window.location.origin;
  var iframeUrl = host + '/embed/' + (agentId || 'default');

  var container = document.createElement('div');
  container.id = 'qwalify-chat-root';
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  container.style.right = '24px';
  container.style.zIndex = '999999';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'flex-end';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  var btn = document.createElement('button');
  btn.style.width = '60px';
  btn.style.height = '60px';
  btn.style.borderRadius = '50%';
  btn.style.background = 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)';
  btn.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.45)';
  btn.style.border = 'none';
  btn.style.cursor = 'pointer';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.color = '#ffffff';
  btn.style.fontSize = '26px';
  btn.style.transition = 'all 0.25s ease';
  btn.innerHTML = '⚡';

  var frame = document.createElement('iframe');
  frame.src = iframeUrl;
  frame.style.width = '390px';
  frame.style.height = '600px';
  frame.style.maxHeight = 'calc(100vh - 120px)';
  frame.style.maxWidth = 'calc(100vw - 48px)';
  frame.style.border = 'none';
  frame.style.borderRadius = '24px';
  frame.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)';
  frame.style.marginBottom = '16px';
  frame.style.display = 'none';
  frame.style.backgroundColor = '#0b0f19';

  var isOpen = false;
  btn.onclick = function() {
    isOpen = !isOpen;
    if (isOpen) {
      frame.style.display = 'block';
      btn.innerHTML = '✕';
      btn.style.transform = 'scale(0.95)';
    } else {
      frame.style.display = 'none';
      btn.innerHTML = '⚡';
      btn.style.transform = 'scale(1)';
    }
  };

  container.appendChild(frame);
  container.appendChild(btn);
  document.body.appendChild(container);
})();
