export interface ErrorPanel {
  element: HTMLElement;
  show: (message: string) => void;
  hide: () => void;
}

export function createErrorPanel(): ErrorPanel {
  const el = document.createElement('div');
  el.className = 'error-panel';

  const label = document.createElement('div');
  label.className = 'error-label';
  label.textContent = 'Error';

  const msg = document.createElement('div');
  msg.className = 'error-message';

  el.appendChild(label);
  el.appendChild(msg);

  return {
    element: el,
    show(message: string) {
      msg.textContent = message;
      el.classList.add('visible');
    },
    hide() {
      el.classList.remove('visible');
      msg.textContent = '';
    },
  };
}
