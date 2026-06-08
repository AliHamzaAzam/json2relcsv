import './styles/main.css';

import { SAMPLES } from './samples.ts';
import { convert } from './runner.ts';
import type { ConvertResult } from './runner.ts';

import { createEditor, getEditorValue, setEditorValue } from './ui/editor.ts';
import { createTabBar } from './ui/tabs.ts';
import type { TabId } from './ui/tabs.ts';
import { createErrorPanel } from './ui/error-panel.ts';
import { renderTablesView } from './ui/tables-view.ts';
import { renderSchemaView } from './ui/schema-view.ts';
import { renderAstView } from './ui/ast-view.ts';

// ── Build DOM skeleton ─────────────────────────────────────────────────────

const app = document.getElementById('app')!;

// Terminal frame
const frame = document.createElement('div');
frame.className = 'terminal-frame';
app.appendChild(frame);

// Title bar
const titlebar = document.createElement('div');
titlebar.className = 'terminal-titlebar';

const dots = document.createElement('div');
dots.className = 'terminal-dots';
['terminal-dot--red', 'terminal-dot--yellow', 'terminal-dot--green'].forEach((cls) => {
  const dot = document.createElement('span');
  dot.className = `terminal-dot ${cls}`;
  dots.appendChild(dot);
});

const titleEl = document.createElement('span');
titleEl.className = 'terminal-title';
titleEl.textContent = 'json2relcsv — JSON → Relational CSV';

titlebar.appendChild(dots);
titlebar.appendChild(titleEl);
frame.appendChild(titlebar);

// Two-pane split
const paneContainer = document.createElement('div');
paneContainer.className = 'pane-container';
frame.appendChild(paneContainer);

// ── LEFT PANE ──────────────────────────────────────────────────────────────

const leftPane = document.createElement('div');
leftPane.className = 'pane pane--left';
paneContainer.appendChild(leftPane);

// Pane header
const leftHeader = document.createElement('div');
leftHeader.className = 'pane-header';
leftHeader.textContent = 'Input JSON';
leftPane.appendChild(leftHeader);

// Editor container
const editorWrap = document.createElement('div');
editorWrap.className = 'editor-wrap';
leftPane.appendChild(editorWrap);

// Controls (sample buttons + convert)
const controls = document.createElement('div');
controls.className = 'editor-controls';
leftPane.appendChild(controls);

// Sample row
const sampleRow = document.createElement('div');
sampleRow.className = 'sample-row';

const sampleLabel = document.createElement('span');
sampleLabel.className = 'sample-label';
sampleLabel.textContent = 'Samples:';
sampleRow.appendChild(sampleLabel);

controls.appendChild(sampleRow);

// Convert row
const convertRow = document.createElement('div');
convertRow.className = 'convert-row';
controls.appendChild(convertRow);

const convertBtn = document.createElement('button');
convertBtn.className = 'btn btn--primary';
convertBtn.textContent = 'Convert';
convertRow.appendChild(convertBtn);

const hint = document.createElement('span');
hint.className = 'convert-hint';
hint.textContent = '⌘/Ctrl+Enter';
convertRow.appendChild(hint);

// ── RIGHT PANE ─────────────────────────────────────────────────────────────

const rightPane = document.createElement('div');
rightPane.className = 'pane pane--right';
paneContainer.appendChild(rightPane);

// Pane header
const rightHeader = document.createElement('div');
rightHeader.className = 'pane-header';
rightHeader.textContent = 'Output';
rightPane.appendChild(rightHeader);

// Tab bar container
const tabBarContainer = document.createElement('div');
rightPane.appendChild(tabBarContainer);

// Error panel (between tab bar and content)
const errorPanel = createErrorPanel();
rightPane.appendChild(errorPanel.element);

// Output content area
const outputContent = document.createElement('div');
outputContent.className = 'output-content';
rightPane.appendChild(outputContent);

// ── State ──────────────────────────────────────────────────────────────────

let activeTab: TabId = 'tables';
let lastResult: ConvertResult | null = null;
let activeSampleIndex = 0;
let isConverting = false;

// ── Tab bar ────────────────────────────────────────────────────────────────

const tabBar = createTabBar({
  container: tabBarContainer,
  tabs: [
    { id: 'tables', label: 'Tables' },
    { id: 'schema', label: 'Schema' },
    { id: 'ast', label: 'AST' },
  ],
  initialTab: activeTab,
  onTabChange(id) {
    activeTab = id;
    renderActiveTab();
  },
});

// ── Editor ─────────────────────────────────────────────────────────────────

const editor = createEditor({
  parent: editorWrap,
  initialValue: SAMPLES[0]!.json,
  onConvert: runConvert,
});

// ── Sample buttons ─────────────────────────────────────────────────────────

const sampleBtns: HTMLButtonElement[] = [];

SAMPLES.forEach((sample, idx) => {
  const btn = document.createElement('button');
  btn.className = 'btn btn--sample' + (idx === 0 ? ' active' : '');
  btn.textContent = sample.name;
  btn.addEventListener('click', () => {
    setEditorValue(editor, sample.json);
    activeSampleIndex = idx;
    sampleBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
  });
  sampleBtns.push(btn);
  sampleRow.appendChild(btn);
});

// ── Convert button ─────────────────────────────────────────────────────────

convertBtn.addEventListener('click', runConvert);

// ── Render helpers ─────────────────────────────────────────────────────────

function renderActiveTab(): void {
  if (!lastResult) return;

  switch (activeTab) {
    case 'tables':
      renderTablesView(outputContent, lastResult);
      break;
    case 'schema':
      renderSchemaView(outputContent, lastResult.schema, lastResult.ok);
      break;
    case 'ast':
      renderAstView(outputContent, lastResult.ast, lastResult.ok);
      break;
  }
}

// ── Conversion ─────────────────────────────────────────────────────────────

async function runConvert(): Promise<void> {
  if (isConverting) return;
  isConverting = true;

  convertBtn.textContent = 'Converting…';
  convertBtn.disabled = true;

  const json = getEditorValue(editor);

  try {
    const result = await convert(json);
    lastResult = result;

    if (result.ok) {
      errorPanel.hide();
    } else {
      errorPanel.show(result.error ?? 'Unknown error');
      // Clear tab content on error
      outputContent.innerHTML = '';
    }

    renderActiveTab();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errorPanel.show(msg);
    outputContent.innerHTML = '';
    lastResult = null;
  } finally {
    convertBtn.textContent = 'Convert';
    convertBtn.disabled = false;
    isConverting = false;
  }
}

// ── Initial load ───────────────────────────────────────────────────────────

// Ensure sample buttons reflect initial selection
sampleBtns[activeSampleIndex]?.classList.add('active');

// Auto-run the first sample on load
void runConvert();

// Suppress unused var: tabBar is used for programmatic tab switching (future use)
void tabBar;
