import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, ListTodo,
  Loader2, Wand2, Sparkles, Trash2, Download, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { checkGrammarMatches } from '../services/languageToolService';
import { rephraseWithGemini } from '../services/geminiRephraseService';
import {
  Editor, Transforms, Element as SlateElement, createEditor,
  Descendant, Node, Range, Path, Point, RangeRef, Text
} from 'slate';
import {
  Slate, Editable, withReact, useSlate, RenderElementProps,
  RenderLeafProps, useSlateStatic, ReactEditor
} from 'slate-react';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';
import { deserializeMarkdown, serializeMarkdown, formatMarkdown, FormattingSettings, getInitialSlateValue } from '../utils/slateHelpers';
import { Tooltip } from 'components/Tooltip';

const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

const HOTKEYS: Record<string, string> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
  'mod+shift+x': 'strikethrough',
};

// --- Helper Functions ---
const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
  );
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes((n as any).type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  });

  let newProperties: Partial<SlateElement>;
  if (TEXT_ALIGN_TYPES.includes(format)) {
    newProperties = { align: isActive ? undefined : format } as any;
  } else {
    newProperties = { type: isActive ? 'paragraph' : isList ? 'list-item' : format } as any;
  }
  if (newProperties.type === 'check-list-item') {
    (newProperties as any).checked = false;
  }
  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block as any);
  }
};

const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (editor: Editor, format: string, blockType = 'type') => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as any)[blockType] === format,
    })
  );
  return !!match;
};

const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? (marks as any)[format] === true : false;
};

// --- Elements & Leaves ---
const Element = (props: RenderElementProps) => {
  const { attributes, children, element } = props;
  const style = { textAlign: (element as any).align };
  const editor = useSlateStatic();

  switch ((element as any).type) {
    case 'block-quote':
      return (
        <blockquote style={style} {...attributes} className="border-l-4 border-slate-200 pl-4 italic my-4 dark:border-slate-700">
          {children}
        </blockquote>
      );
    case 'bulleted-list':
      return (
        <ul style={style} {...attributes} className="list-disc list-inside my-4 text-slate-700 dark:text-slate-300">
          {children}
        </ul>
      );
    case 'list-item':
      return <li style={style} {...attributes}>{children}</li>;
    case 'numbered-list':
      return (
        <ol style={style} {...attributes} className="list-decimal list-inside my-4">
          {children}
        </ol>
      );
    case 'check-list-item':
      const checked = (element as any).checked;
      return (
        <div {...attributes} className="flex flex-row items-center my-1">
          <span contentEditable={false} className="mr-2 select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={event => {
                const path = ReactEditor.findPath(editor, element);
                const newProperties: Partial<SlateElement> = { checked: event.target.checked };
                Transforms.setNodes<SlateElement>(editor, newProperties, { at: path });
              }}
              className="h-4 w-4 rounded border-slate-300 text-google-blue focus:ring-google-blue cursor-pointer"
            />
          </span>
          <span style={{ textDecoration: checked ? 'line-through' : 'none' }} className={`flex-1 ${checked ? 'opacity-50 italic' : ''}`}>
            {children}
          </span>
        </div>
      );
    default:
      return <p style={style} {...attributes} className="my-2">{children}</p>;
  }
};

const Leaf = ({ attributes, children, leaf }: any) => {
  let content = children;
  if (leaf.bold) content = <strong>{content}</strong>;
  if (leaf.italic) content = <em>{content}</em>;
  if (leaf.code) content = <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{content}</code>;
  if (leaf.underline) content = <u>{content}</u>;
  if (leaf.strikethrough) content = <s className="text-slate-500">{content}</s>;

  if (leaf.grammarError) {
    content = (
      <span
        className="bg-pink-100/50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-b-2 border-pink-400 dark:border-pink-500 cursor-pointer transition-colors hover:bg-pink-200/50 dark:hover:bg-pink-800/50"
        onMouseEnter={(e) => {
          e.stopPropagation();
          const event = new CustomEvent('openGrammarMatch', {
            detail: { match: leaf.matchData, rect: e.currentTarget.getBoundingClientRect() }
          });
          window.dispatchEvent(event);
        }}
      >
        {content}
      </span>
    );
  }

  return <span {...attributes}>{content}</span>;
};

function ToolbarButton({ icon, title, onClick, active, onPointerDown, className = "", variant = 'default', forceShow = false }: any) {
  return (
    <Tooltip content={title || ''} className="z-[60]" position="bottom" variant={variant} forceShow={forceShow}>
      <button 
        onClick={onClick}
        onPointerDown={onPointerDown}
        className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] transition-all duration-200 ${
          active ? 'bg-[#4285F4] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        } ${className}`} 
      >
        {icon}
      </button>
    </Tooltip>
  );
}

const MarkButton = ({ format, icon, title }: any) => {
  const editor = useSlate();
  return (
    <ToolbarButton
      active={isMarkActive(editor, format)}
      icon={icon}
      title={title}
      onPointerDown={(event: any) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    />
  );
};

const BlockButton = ({ format, icon, title }: any) => {
  const editor = useSlate();
  return (
    <ToolbarButton
      active={isBlockActive(editor, format, TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type')}
      icon={icon}
      title={title}
      onPointerDown={(event: any) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    />
  );
};

interface SlateEditorProps {
  initialContent: string | Descendant[];
  onChange: (val: Descendant[]) => void;
  fontSize: number;
  activeFileId: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  formattingSettings: FormattingSettings;
  onSettingsChange: (settings: FormattingSettings) => void;
  onDownload?: () => void;
  onShare?: () => void;
}

export function SlateEditor({
  initialContent,
  onChange,
  fontSize,
  activeFileId,
  showToast,
  formattingSettings,
  onSettingsChange,
  onDownload,
  onShare
}: SlateEditorProps) {
  const renderElement = useCallback((props: RenderElementProps) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  // Custom Inline Grammar State
  interface GrammarMatch {
    id: string;
    rangeRef: RangeRef;
    replacements: string[];
    message: string;
    shortMessage: string;
  }
  const [grammarMatches, setGrammarMatches] = useState<GrammarMatch[]>([]);
  const [activeGrammarMatch, setActiveGrammarMatch] = useState<{ match: GrammarMatch, rect: DOMRect } | null>(null);

  useEffect(() => {
    const handleOpenGrammarMatch = (e: any) => {
      setActiveGrammarMatch(e.detail);
    };
    window.addEventListener('openGrammarMatch', handleOpenGrammarMatch);

    const handleClose = () => setActiveGrammarMatch(null);
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose);
    document.addEventListener('click', handleClose);

    return () => {
      window.removeEventListener('openGrammarMatch', handleOpenGrammarMatch);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose);
      document.removeEventListener('click', handleClose);
    };
  }, []);

  useEffect(() => {
    return () => {
      grammarMatches.forEach(m => m.rangeRef.unref());
    };
  }, [grammarMatches]);

  const decorate = useCallback(([node, path]: [Node, Path]) => {
    const ranges: any[] = [];
    if (!Text.isText(node)) return ranges;
    if (grammarMatches.length === 0) return ranges;

    for (const match of grammarMatches) {
      const currentRange = match.rangeRef.current;
      if (currentRange && Range.includes(currentRange, path)) {
        const intersection = Range.intersection(currentRange, {
          anchor: { path, offset: 0 },
          focus: { path, offset: node.text.length }
        });
        if (intersection) {
          ranges.push({ ...intersection, grammarError: true, matchData: match });
        }
      }
    }
    return ranges;
  }, [grammarMatches]);

  const applyGrammarFix = (match: GrammarMatch, replacement: string) => {
    const currentRange = match.rangeRef.current;
    if (!currentRange) return;
    Transforms.select(editor, currentRange);
    Transforms.insertText(editor, replacement);

    match.rangeRef.unref();
    setGrammarMatches(prev => prev.filter(m => m.id !== match.id));
    setActiveGrammarMatch(null);
  };

  const dismissGrammarMatch = (match: GrammarMatch) => {
    match.rangeRef.unref();
    setGrammarMatches(prev => prev.filter(m => m.id !== match.id));
    setActiveGrammarMatch(null);
  };

  const [isRephrasing, setIsRephrasing] = useState(false);
  const [isHoveredGrammar, setIsHoveredGrammar] = useState(false);

  const handleAIRephrase = async () => {
    if (editor.children.length === 0 || isRephrasing) return;
    
    setIsRephrasing(true);
    showToast("Gemini is refining your text...", "info");

    try {
      const rawMarkdown = serializeMarkdown(editor.children);
      const formattedMarkdown = formatMarkdown(rawMarkdown, formattingSettings);
      
      const rephrased = await rephraseWithGemini(formattedMarkdown);
      const newNodes = deserializeMarkdown(rephrased);

      if (rephrased.trim() === formattedMarkdown.trim()) {
        showToast("Gemini returned original text. No changes needed.", "info");
        return;
      }

      Transforms.delete(editor, {
        at: { anchor: Editor.start(editor, []), focus: Editor.end(editor, []) },
      });
      Transforms.insertNodes(editor, newNodes);
      
      grammarMatches.forEach(m => m.rangeRef.unref());
      setGrammarMatches([]);
      setActiveGrammarMatch(null);
      
      showToast("Text perfected by Gemini!", "success");
    } catch (error) {
       console.error("Gemini AI failed:", error);
       showToast("Gemini is currently unavailable. Try again in a moment.", "error");
    } finally {
      setIsRephrasing(false);
    }
  };

  const runGrammarCheck = async (silent = false) => {
    if (editor.children.length === 0 || isCheckingRef.current) return;
    isCheckingRef.current = true;
    if (!silent) setIsCorrecting(true);

    grammarMatches.forEach(m => m.rangeRef.unref());
    setGrammarMatches([]);
    setActiveGrammarMatch(null);

    const newMatches: GrammarMatch[] = [];

    try {
      for (const [blockNode, blockPath] of Editor.nodes(editor, {
        match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n as SlateElement)
      })) {
        const text = Node.string(blockNode);
        if (!text.trim()) continue;

        const ltMatches = await checkGrammarMatches(text);

        for (const m of ltMatches) {
           let currentOffset = 0;
           let anchorPoint: Point | null = null;
           let focusPoint: Point | null = null;

           for (const [textNode, textPath] of Editor.nodes(editor, { at: blockPath, match: Text.isText })) {
             const nodeLength = (textNode as any).text.length;

             if (!anchorPoint && m.offset < currentOffset + nodeLength) {
               anchorPoint = { path: textPath, offset: m.offset - currentOffset };
             }
             if (anchorPoint && !focusPoint && m.offset + m.length <= currentOffset + nodeLength) {
               focusPoint = { path: textPath, offset: m.offset + m.length - currentOffset };
               break;
             }
             currentOffset += nodeLength;
           }

           if (anchorPoint && focusPoint && m.replacements.length > 0) {
              const matchRange = { anchor: anchorPoint, focus: focusPoint };
              const rangeRef = Editor.rangeRef(editor, matchRange, { affinity: 'forward' });
              newMatches.push({
                id: Math.random().toString(36).substring(7),
                rangeRef,
                replacements: m.replacements.map(r => r.value),
                message: m.message,
                shortMessage: m.shortMessage
              });
           }
        }
      }

      setGrammarMatches(newMatches);

      if (!silent) {
        if (newMatches.length > 0) {
          showToast(`Found ${newMatches.length} grammar issues`, "info");
        } else {
          showToast("No grammar issues found!", "success");
        }
      }
    } catch (error) {
      if (!silent) showToast("Grammar check failed.", "error");
    } finally {
      isCheckingRef.current = false;
      if (!silent) setIsCorrecting(false);
    }
  };

  const handleFixAllGrammar = async () => {
    if (isCorrecting) return;

    if (grammarMatches.length === 0) {
      await runGrammarCheck(false);
      return;
    }

    const sorted = [...grammarMatches].sort((a, b) => {
      const aRange = a.rangeRef.current;
      const bRange = b.rangeRef.current;
      if (!aRange || !bRange) return 0;
      return Path.compare(bRange.anchor.path, aRange.anchor.path) || bRange.anchor.offset - aRange.anchor.offset;
    });

    let fixedCount = 0;
    for (const match of sorted) {
      const currentRange = match.rangeRef.current;
      if (!currentRange || match.replacements.length === 0) continue;
      Transforms.select(editor, currentRange);
      Transforms.insertText(editor, match.replacements[0]);
      match.rangeRef.unref();
      fixedCount++;
    }

    setGrammarMatches([]);
    setActiveGrammarMatch(null);
    showToast(`Fixed ${fixedCount} grammar issues!`, "success");
  };

  const [value, setValue] = useState<Descendant[]>(() => {
    if (typeof initialContent === 'string') {
      if (initialContent.trim().startsWith('[{') || initialContent.trim().startsWith('{"')) {
        try {
          return JSON.parse(initialContent);
        } catch {
          // Fall back to markdown if invalid
        }
      }
      return initialContent ? deserializeMarkdown(initialContent) : getInitialSlateValue();
    }
    return initialContent || getInitialSlateValue();
  });

  useEffect(() => {
    let newValue: Descendant[];
    if (typeof initialContent === 'string') {
      if (initialContent.trim().startsWith('[{') || initialContent.trim().startsWith('{"')) {
        try {
          newValue = JSON.parse(initialContent);
        } catch {
          newValue = initialContent ? deserializeMarkdown(initialContent) : getInitialSlateValue();
        }
      } else {
        newValue = initialContent ? deserializeMarkdown(initialContent) : getInitialSlateValue();
      }
    } else {
      newValue = initialContent || getInitialSlateValue();
    }
    setValue(newValue);
    editor.children = newValue;
    editor.onChange();
  }, [activeFileId, editor, initialContent]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const { selection } = editor;
    
    if (event.key === 'Backspace' && selection && Range.isCollapsed(selection)) {
      const entry = Editor.above(editor, {
        match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && Editor.isBlock(editor, n)
      });

      if (entry) {
        const [node, path] = entry;
        const isAtStart = Editor.isStart(editor, selection.anchor, path);
        
        if (isAtStart) {
          const type = (node as any).type;
          if (type === 'list-item') {
            const parent = Editor.parent(editor, path);
            if (parent && SlateElement.isElement(parent[0]) && LIST_TYPES.includes((parent[0] as any).type)) {
              event.preventDefault();
              toggleBlock(editor, (parent[0] as any).type);
              return;
            }
          } else if (type === 'check-list-item') {
            event.preventDefault();
            toggleBlock(editor, type);
            return;
          }
        }
      }
    }

    for (const hotkey in HOTKEYS) {
      if (isHotkey(hotkey, event as any)) {
        event.preventDefault();
        const mark = HOTKEYS[hotkey];
        toggleMark(editor, mark);
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-[20px] w-full">
      <Slate
        editor={editor}
        initialValue={value}
        onChange={val => {
          const isAstChange = editor.operations.some(op => op.type !== 'set_selection');

          if (isAstChange) {
            if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
            setActiveGrammarMatch(null);
            checkTimerRef.current = setTimeout(() => {
              runGrammarCheck(true);
            }, 2000);
          }
          setValue(val);
          
          // Only propagate up to FileContext if the user actually made AST content changes
          if (isAstChange) {
            onChange(val);
          }
        }}
      >
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-0.5 md:gap-1">
            <MarkButton format="bold" icon={<Bold size={16} />} title="Bold (Ctrl+B)" />
            <MarkButton format="italic" icon={<Italic size={16} />} title="Italic (Ctrl+I)" />
            <MarkButton format="underline" icon={<Underline size={16} />} title="Underline (Ctrl+U)" />
            <MarkButton format="strikethrough" icon={<Strikethrough size={16} />} title="Strikethrough (Ctrl+Shift+X)" />
            <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
            <BlockButton format="bulleted-list" icon={<List size={16} />} title="Bulleted List" />
            <BlockButton format="numbered-list" icon={<ListOrdered size={16} />} title="Numbered List" />
            <BlockButton format="check-list-item" icon={<ListTodo size={16} />} title="Check List" />
            
            <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
            
            <div className="flex items-center gap-[6px] ml-1">
              <div className="group relative z-[60]">
                <ToolbarButton 
                  active={false}
                  variant={grammarMatches.length > 0 ? 'error' : 'default'}
                  forceShow={grammarMatches.length > 0}
                  icon={
                    <div className="relative">
                      {isCorrecting ? (
                        <Loader2 size={18} strokeWidth={2.5} className="animate-spin text-white" />
                      ) : (
                        <>
                          <Wand2 
                            size={18} 
                            strokeWidth={2.5} 
                            className={grammarMatches.length > 0 ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#FF3B30] transition-colors duration-200'} 
                          />
                        </>
                      )}
                    </div>
                  } 
                  title={grammarMatches.length === 0 ? "Fix Grammar" : `Fix ${grammarMatches.length} grammar issue${grammarMatches.length > 1 ? 's' : ''}`} 
                  onClick={handleFixAllGrammar} 
                  className={`!rounded-[10px] !h-[34px] !w-[34px] bg-transparent group-hover:bg-red-50 dark:group-hover:bg-red-500/10 ${grammarMatches.length > 0 ? '!bg-[#FF3B30] !text-white shadow-sm ring-1 ring-[#FF3B30]/30' : ''}`}
                />
              </div>

              <div className="group relative z-[60]">
                <ToolbarButton 
                  active={false}
                  icon={<Sparkles size={18} strokeWidth={2.5} className={isRephrasing ? 'animate-spin text-[#A855F7]' : 'animate-gemini text-[#A855F7]'} />} 
                  title="Refine with Gemini" 
                  onClick={handleAIRephrase} 
                  className={`!rounded-[10px] !h-[34px] !w-[34px] bg-transparent group-hover:bg-purple-50 dark:group-hover:bg-purple-500/10 ${isRephrasing ? 'bg-purple-50 dark:bg-purple-500/10 ring-[1px] ring-[#A855F7]/30 shadow-sm' : ''}`}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {onShare && (
              <ToolbarButton 
                active={false}
                icon={<Share2 size={16} className="text-slate-500" />} 
                title="Share Link" 
                onClick={onShare}
              />
            )}
            {onDownload && (
              <ToolbarButton 
                active={false}
                icon={<Download size={16} className="text-slate-500" />} 
                title="Download Note" 
                onClick={onDownload}
              />
            )}
          </div>
        </div>

        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          decorate={decorate}
          placeholder="Start typing your masterpieces here..."
          spellCheck
          autoFocus
          onKeyDown={onKeyDown}
          style={{ fontSize: `${fontSize}px` }}
          className="editor-area h-full min-h-[500px] w-full outline-none leading-relaxed text-slate-800 dark:text-slate-200 font-sans"
        />

        {activeGrammarMatch && (
          <div
            className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 dark:border-slate-700 p-4 w-72 text-sm font-sans"
            style={{
              top: activeGrammarMatch.rect.bottom + 8,
              left: Math.max(10, activeGrammarMatch.rect.left - 50)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3">
              {activeGrammarMatch.match.shortMessage || "Replace the word"}
            </div>

            {(activeGrammarMatch.match.message && activeGrammarMatch.match.message !== activeGrammarMatch.match.shortMessage) && (
              <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 rounded-lg p-2.5 mb-3 text-xs leading-relaxed border border-orange-100 dark:border-orange-900/50">
                {activeGrammarMatch.match.message}
              </div>
            )}

            <div className="space-y-1 mt-2">
              {activeGrammarMatch.match.replacements.slice(0, 3).map((r, i) => (
                <button
                  key={i}
                  className="block w-full text-left px-3 py-2.5 bg-google-blue/5 hover:bg-google-blue/15 text-google-blue hover:text-blue-700 dark:hover:text-blue-400 rounded-lg font-bold transition-all"
                  onClick={() => applyGrammarFix(activeGrammarMatch.match, r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              className="flex items-center justify-center gap-2 w-full text-center px-3 py-2.5 mt-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500 rounded-lg border-t border-slate-100 dark:border-slate-700 font-medium"
              onClick={() => dismissGrammarMatch(activeGrammarMatch.match)}
            >
              <Trash2 size={14} /> Dismiss
            </button>
          </div>
        )}
      </Slate>
    </div>
  );
}
