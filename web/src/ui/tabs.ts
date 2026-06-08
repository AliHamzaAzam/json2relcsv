export type TabId = 'tables' | 'schema' | 'ast';

export interface TabsOptions {
  container: HTMLElement;
  tabs: { id: TabId; label: string }[];
  initialTab: TabId;
  onTabChange: (id: TabId) => void;
}

export function createTabBar(opts: TabsOptions): { setActive: (id: TabId) => void } {
  const bar = document.createElement('div');
  bar.className = 'tab-bar';

  const buttons = new Map<TabId, HTMLButtonElement>();

  for (const { id, label } of opts.tabs) {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.textContent = label;
    if (id === opts.initialTab) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      // Deactivate all, activate clicked
      for (const [, b] of buttons) b.classList.remove('active');
      btn.classList.add('active');
      opts.onTabChange(id);
    });
    buttons.set(id, btn);
    bar.appendChild(btn);
  }

  opts.container.appendChild(bar);

  return {
    setActive(id: TabId) {
      for (const [tid, b] of buttons) {
        b.classList.toggle('active', tid === id);
      }
    },
  };
}
