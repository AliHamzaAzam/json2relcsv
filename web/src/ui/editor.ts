import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { indentWithTab } from '@codemirror/commands';
import { basicSetup } from 'codemirror';

export interface EditorOptions {
  parent: HTMLElement;
  initialValue: string;
  /** Called when Cmd/Ctrl+Enter is pressed in the editor */
  onConvert: () => void;
}

export function createEditor(opts: EditorOptions): EditorView {
  const convertKeymap = keymap.of([
    {
      key: 'Mod-Enter',
      run() {
        opts.onConvert();
        return true;
      },
    },
  ]);

  const state = EditorState.create({
    doc: opts.initialValue,
    extensions: [
      // basicSetup already includes line numbers, active-line highlighting,
      // and the default keymap.
      basicSetup,
      json(),
      keymap.of([indentWithTab]),
      convertKeymap,
      EditorView.theme({
        '&': {
          fontFamily: '"JetBrains Mono", "Courier New", monospace',
          fontSize: '13px',
          height: '100%',
        },
        '.cm-scroller': {
          fontFamily: '"JetBrains Mono", "Courier New", monospace',
        },
        '.cm-gutters': {
          background: '#f3f4f6',
          borderRight: '2px solid #111',
          color: '#9ca3af',
        },
        '.cm-activeLineGutter': {
          background: '#e5e7eb',
        },
        '.cm-activeLine': {
          background: '#f0f0ff',
        },
      }),
    ],
  });

  return new EditorView({ state, parent: opts.parent });
}

export function getEditorValue(view: EditorView): string {
  return view.state.doc.toString();
}

export function setEditorValue(view: EditorView, value: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
  });
}
