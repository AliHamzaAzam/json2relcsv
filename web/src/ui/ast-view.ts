export function renderAstView(container: HTMLElement, ast: string, ok: boolean): void {
  container.innerHTML = '';

  if (!ok) {
    const p = document.createElement('div');
    p.className = 'placeholder';
    p.textContent = 'Conversion failed — see error above.';
    container.appendChild(p);
    return;
  }

  if (!ast.trim()) {
    const p = document.createElement('div');
    p.className = 'placeholder';
    p.textContent = 'No AST output.';
    container.appendChild(p);
    return;
  }

  const pre = document.createElement('pre');
  pre.className = 'ast-pre';
  pre.textContent = ast;
  container.appendChild(pre);
}
