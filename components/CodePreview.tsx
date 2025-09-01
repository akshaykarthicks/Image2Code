import Editor from '@monaco-editor/react';
import { Check, Code2, Copy, MessageCircle, Play } from 'lucide-react';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ToggleButton from './ToggleButton';

interface Output {
  id: number;
  code: string;
  fullResponse: string;
}

interface CodePreviewProps {
  output: Output;
  onCodeChange: (id: number, newCode: string) => void;
  fullResponse: string;
}

const CodePreview: React.FC<CodePreviewProps> = ({ output, onCodeChange, fullResponse }) => {
  const [showCode, setShowCode] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const renderPreview = (htmlCode: string) => {
    return (
      <div className="relative w-full h-[500px] bg-gray-50 rounded-lg overflow-hidden">
        <iframe
          srcDoc={htmlCode}
          title="HTML Preview"
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          className="absolute inset-0"
        />
      </div>
    );
  };

  const htmlCode = output?.code || '';

  return (
    <div className="mb-4 p-6 rounded-3xl bg-gray-100">
      <div className="mb-4">
        {showCode ? (
          <div className="w-full h-[500px] rounded-lg overflow-hidden border">
            <Editor
              height="500px"
              defaultLanguage="html"
              value={htmlCode}
              onChange={(value) => onCodeChange(output.id, value || '')}
              theme="light"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'off',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>
        ) : showReasoning ? (
          <div className="w-full h-[500px] rounded-lg overflow-y-auto border p-4 prose prose-xs max-w-none bg-white">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="text-xs text-gray-700"
              components={{
                code: ({ node, className, children, ...props }) => (
                  <code
                    className={`${className} text-[0.7rem] bg-slate-50 text-slate-900 px-1.5 py-0.5 rounded border border-slate-200`}
                    {...props}
                  >
                    {children}
                  </code>
                ),
                pre: ({ node, children, ...props }) => (
                  <pre
                    className="text-[0.7rem] bg-slate-50 text-slate-900 p-3 rounded-md overflow-x-auto border border-slate-200"
                    {...props}
                  >
                    {children}
                  </pre>
                ),
                p: ({ node, children }) => (
                  <p className="text-xs mb-2 text-gray-700">{children}</p>
                ),
                h1: ({ node, children }) => (
                  <h1 className="text-sm font-bold mb-2 text-gray-900">
                    {children}
                  </h1>
                ),
                h2: ({ node, children }) => (
                  <h2 className="text-xs font-bold mb-2 text-gray-900">
                    {children}
                  </h2>
                ),
                h3: ({ node, children }) => (
                  <h3 className="text-xs font-semibold mb-1 text-gray-900">
                    {children}
                  </h3>
                ),
                ul: ({ node, children }) => (
                  <ul className="text-xs list-disc pl-4 mb-2 text-gray-700">
                    {children}
                  </ul>
                ),
                ol: ({ node, children }) => (
                  <ol className="text-xs list-decimal pl-4 mb-2 text-gray-700">
                    {children}
                  </ol>
                ),
                li: ({ node, children }) => (
                  <li className="text-xs mb-1 text-gray-700">{children}</li>
                ),
              }}
            >
              {fullResponse}
            </ReactMarkdown>
          </div>
        ) : (
          renderPreview(htmlCode)
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-2">
        <div className="inline-flex rounded-full bg-gray-200 gap-1 w-full sm:w-auto justify-center">
          <ToggleButton
            icon={Play}
            label="Preview"
            isSelected={!showCode && !showReasoning}
            onClick={() => {
              setShowCode(false);
              setShowReasoning(false);
            }}
          />
          <ToggleButton
            icon={MessageCircle}
            label="Reasoning"
            isSelected={showReasoning}
            onClick={() => {
              setShowCode(false);
              setShowReasoning(true);
            }}
          />
          <ToggleButton
            icon={Code2}
            label="Code"
            isSelected={showCode}
            onClick={() => {
              setShowCode(true);
              setShowReasoning(false);
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`px-3.5 py-2.5 rounded-full transition-colors inline-flex text-sm border border-gray-300
            items-center gap-1 w-full sm:w-auto justify-center ${
              isCopied
                ? 'bg-gray-500 text-white'
                : 'bg-transparent text-gray-700 hover:bg-gray-100'
            }`}
        >
          {isCopied ? (
            <>
              <Check size={14} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy Code
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CodePreview;
