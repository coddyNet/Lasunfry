import { Descendant, Text, Element as SlateElement } from 'slate'

// Initial content for new documents
export const initialSlateValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

export const getInitialSlateValue = (): Descendant[] => [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

// Simple Markdown to Slate Deserializer (with list grouping)
export const deserializeMarkdown = (markdown: string): Descendant[] => {
  if (!markdown) return getInitialSlateValue();
  
  const lines = markdown.split('\n');
  const rawNodes: Descendant[] = lines
    .filter(line => line.trim() !== '')
    .map(line => {
      const trimmed = line.trim();
      
      // Check for task lists: - [ ] or - [x]
      const taskMatch = trimmed.match(/^-\s\[(x|\s)\]\s(.*)/i);
      if (taskMatch) {
        return {
          type: 'check-list-item',
          checked: taskMatch[1].toLowerCase() === 'x',
          children: [{ text: taskMatch[2] }],
        };
      }

      // Check for numbered lists: 1. text
      const numberedMatch = trimmed.match(/^\d+\.\s(.*)/);
      if (numberedMatch) {
        return {
          type: 'list-item',
          listType: 'numbered-list',
          children: [{ text: numberedMatch[1] }],
        };
      }

      // Check for bulleted lists: - or * or +
      const bulletMatch = trimmed.match(/^[-*+]\s(.*)/);
      if (bulletMatch) {
        return {
          type: 'list-item',
          listType: 'bulleted-list',
          children: [{ text: bulletMatch[1] }],
        };
      }

      // Check for blockquotes
      const quoteMatch = trimmed.match(/^>\s?(.*)/);
      if (quoteMatch) {
        return { type: 'block-quote', children: [{ text: quoteMatch[1] }] };
      }

      // Check for headers
      if (trimmed.startsWith('## ')) {
        return { type: 'heading-two', children: [{ text: trimmed.slice(3) }] };
      }
      if (trimmed.startsWith('# ')) {
        return { type: 'heading-one', children: [{ text: trimmed.slice(2) }] };
      }

      return {
        type: 'paragraph',
        children: [{ text: line }],
      };
    });
  
  // Group consecutive list-items into their wrapper elements
  const grouped: Descendant[] = [];
  let i = 0;
  while (i < rawNodes.length) {
    const node = rawNodes[i] as any;
    
    if (node.type === 'list-item' && node.listType) {
      const wrapperType = node.listType;
      const items: Descendant[] = [];
      
      while (i < rawNodes.length && (rawNodes[i] as any).type === 'list-item' && (rawNodes[i] as any).listType === wrapperType) {
        const item = rawNodes[i] as any;
        delete item.listType; // clean up temp property
        items.push(item);
        i++;
      }
      
      grouped.push({
        type: wrapperType,
        children: items,
      } as any);
    } else {
      grouped.push(node);
      i++;
    }
  }
    
  return grouped.length > 0 ? grouped : initialSlateValue;
}

// Recursive Slate to Markdown Serializer
export const serializeMarkdown = (nodes: Descendant[]): string => {
  return nodes
    .map(n => {
      if (SlateElement.isElement(n)) {
        const type = n.type as string;
        
        // For wrapper elements (bulleted-list, numbered-list), serialize children (list-items)
        if (type === 'bulleted-list') {
          return (n.children as Descendant[])
            .map(child => {
              const text = serializeNode(child);
              return `- ${text}\n`;
            })
            .join('');
        }
        if (type === 'numbered-list') {
          return (n.children as Descendant[])
            .map((child, idx) => {
              const text = serializeNode(child);
              return `${idx + 1}. ${text}\n`;
            })
            .join('');
        }
        
        // For leaf-level elements, serialize inline content
        const children = serializeInlineContent(n.children);
        switch (type) {
          case 'heading-one': return `# ${children}\n`;
          case 'heading-two': return `## ${children}\n`;
          case 'block-quote': return `> ${children}\n`;
          case 'list-item': return `- ${children}\n`;
          case 'check-list-item': return `- [${(n as any).checked ? 'x' : ' '}] ${children}\n`;
          default: return `${children}\n`;
        }
      }
      return '';
    })
    .join('');
}

// Serialize a single node (could be element or text)
const serializeNode = (node: Descendant): string => {
  if (Text.isText(node)) {
    return serializeLeaf(node);
  }
  if (SlateElement.isElement(node)) {
    return serializeInlineContent(node.children);
  }
  return '';
}

// Serialize inline children (mix of text leaves with marks)
const serializeInlineContent = (children: Descendant[]): string => {
  return children.map(c => {
    if (Text.isText(c)) return serializeLeaf(c);
    if (SlateElement.isElement(c)) return serializeInlineContent(c.children);
    return '';
  }).join('');
}

export interface FormattingSettings {
  listMarker: '-' | '*' | '+';
  collapseEmptyLines: boolean;
  spaceAfterHeading: boolean;
  emptyLineBeforeHeading: boolean;
  trimTrailingWhitespace: boolean;
  emptyLineAroundBlockquote: boolean;
}

export const DEFAULT_FORMATTING_SETTINGS: FormattingSettings = {
  listMarker: '-',
  collapseEmptyLines: true,
  spaceAfterHeading: true,
  emptyLineBeforeHeading: true,
  trimTrailingWhitespace: true,
  emptyLineAroundBlockquote: true,
};

// Advanced Formatting Logic for Markdown
export const formatMarkdown = (markdown: string, settings: FormattingSettings = DEFAULT_FORMATTING_SETTINGS): string => {
  if (!markdown) return '';

  let formatted = markdown;

  // 1. Remove trailing whitespace from all lines
  if (settings.trimTrailingWhitespace) {
    formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n');
  }

  // 2. Collapse 3+ empty lines into 2 empty lines
  if (settings.collapseEmptyLines) {
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
  }

  // 3. Ensure space after heading markers
  if (settings.spaceAfterHeading) {
    formatted = formatted.replace(/^(#+)([^#\s])/gm, '$1 $2');
  }

  // 4. Ensure one empty line before headings (if not at start)
  if (settings.emptyLineBeforeHeading) {
    formatted = formatted.replace(/([^\n])\n(#+\s)/g, '$1\n\n$2');
  }

  // 5. Normalize list markers
  const listMarkerRegex = settings.listMarker === '*' ? /^-\s/gm : settings.listMarker === '+' ? /^[*-]\s/gm : /^\*\s/gm;
  formatted = formatted.replace(listMarkerRegex, `${settings.listMarker} `);

  // 6. Ensure one empty line before and after blockquotes
  if (settings.emptyLineAroundBlockquote) {
    formatted = formatted.replace(/([^\n])\n(>\s)/g, '$1\n\n$2');
    formatted = formatted.replace(/(>\s.*)\n([^\n>])/g, '$1\n\n$2');
  }

  // 7. Normalize task list markers
  formatted = formatted.replace(/^-\s\[\s\]/gm, '- [ ]');
  formatted = formatted.replace(/^-\s\[X\]/gmi, '- [x]');

  // 8. Capitalize first letter of each sentence
  // After sentence-ending punctuation (. ! ?) followed by whitespace
  formatted = formatted.replace(/([.!?])\s+([a-z])/g, (_match, punct, letter) => `${punct} ${letter.toUpperCase()}`);
  // Capitalize first lowercase letter on every line (handles all prefixes: -, *, +, >, #, 1., - [ ], etc.)
  formatted = formatted.replace(/^([^a-zA-Z]*)([a-z])/gm, (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);

  return formatted + '\n';
}

const serializeLeaf = (leaf: any): string => {
  let text = leaf.text;
  if (leaf.bold) text = `**${text}**`;
  if (leaf.italic) text = `*${text}*`;
  if (leaf.code) text = `\`${text}\``;
  return text;
}
