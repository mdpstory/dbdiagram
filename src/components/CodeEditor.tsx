import React, { useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange }) => {
  // Create an extension for line wrapping
  const lineWrapping = EditorView.lineWrapping;

  // Define DBML extensions (based on SQL with some customizations)
  const extensions = [
    sql(),
    oneDark,
    lineWrapping, // Add line wrapping extension
    // You can add more extensions for custom features
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-800 text-white p-2 font-bold">DBML Code</div>
      <div className="flex-grow overflow-hidden">
        <CodeMirror
          value={value}
          height="100%"
          onChange={onChange}
          extensions={extensions}
          theme="dark"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          style={{ fontSize: "14px" }}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default CodeEditor;
