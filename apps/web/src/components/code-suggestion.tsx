import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  Copy,
  GitCompare,
  FileText,
  MapPin
} from 'lucide-react';

interface CodeSuggestion {
  file: string;
  line?: number;
  original: string;
  suggested: string;
  reason: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

interface CodeSuggestionCardProps {
  suggestion: CodeSuggestion;
  index: number;
  theme?: 'light' | 'dark';
}

// Get the appropriate file extension for syntax highlighting
const getLanguageFromFile = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'php':
      return 'php';
    case 'rb':
      return 'ruby';
    case 'swift':
      return 'swift';
    case 'kt':
      return 'kotlin';
    case 'dart':
      return 'dart';
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'md':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'css':
      return 'css';
    case 'scss':
      return 'scss';
    case 'html':
      return 'html';
    case 'xml':
      return 'xml';
    case 'sh':
    case 'bash':
      return 'bash';
    default:
      return 'text';
  }
};

// Get severity styling
const getSeverityConfig = (severity: string) => {
  switch (severity) {
    case 'HIGH':
      return {
        variant: 'destructive' as const,
        icon: <XCircle className="h-4 w-4" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    case 'MEDIUM':
      return {
        variant: 'default' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    case 'LOW':
      return {
        variant: 'secondary' as const,
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    default:
      return {
        variant: 'outline' as const,
        icon: <Info className="h-4 w-4" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
  }
};

// Copy to clipboard function
const copyToClipboard = async (text: string, type: string = 'Code') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    toast.success(`${type} copied to clipboard!`);
  }
};

export const CodeSuggestionCard: React.FC<CodeSuggestionCardProps> = ({ 
  suggestion, 
  index, 
  theme = 'light' 
}) => {
  const severityConfig = getSeverityConfig(suggestion.severity);
  const language = getLanguageFromFile(suggestion.file);
  const syntaxTheme = theme === 'dark' ? vscDarkPlus : vs;

  return (
    <div className={`overflow-hidden border-3 border-gray-600 bg-white mb-6`}>
      {/* Header */}
      <div className="bg-gray-100 px-6 py-4 border-b-3 border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`${severityConfig.color}`}>
              {severityConfig.icon}
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${severityConfig.bgColor.replace('bg-', 'bg-')} ${severityConfig.color} px-3 py-1 text-xs font-bold border-2 border-gray-800`}>
                {suggestion.severity}
              </Badge>
              <Badge className="bg-black text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
                {suggestion.category}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-black font-bold">
            <FileText className="h-5 w-5" />
            <code className="font-mono bg-gray-200 px-2 py-1 border-2 border-gray-600 text-black font-bold">
              {suggestion.file}
            </code>
            {suggestion.line && (
              <>
                <MapPin className="h-5 w-5" />
                <span className="bg-blue-600 text-white px-2 py-1 text-xs font-bold border-2 border-gray-800">
                  Line {suggestion.line}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-0">
        {/* Description */}
        <div className="p-6 bg-white border-b-3 border-gray-600">
          <div className="flex items-start gap-4">
            <GitCompare className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-black text-lg mb-3 uppercase">
                Suggestion #{index + 1}
              </h4>
              <p className="text-sm text-black leading-relaxed font-medium">
                {suggestion.reason}
              </p>
            </div>
          </div>
        </div>

        {/* Code Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Current Code */}
          <div className="border-r-3 border-gray-600">
            <div className="bg-red-100 px-6 py-4 border-b-3 border-gray-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-bold text-black uppercase">Current Code</span>
              </div>
              <button
                onClick={() => copyToClipboard(suggestion.original, 'Current code')}
                className="bg-red-600 text-white px-3 py-2 border-2 border-gray-800 hover:bg-red-700 transition-colors font-bold text-xs uppercase flex items-center gap-2"
                title="Copy current code"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
            <div className="relative">
              <SyntaxHighlighter
                language={language}
                style={syntaxTheme}
                customStyle={{
                  margin: 0,
                  padding: '16px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  background: '#fef2f2',
                  borderRadius: 0,
                }}
                showLineNumbers
                wrapLines
              >
                {suggestion.original}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* Suggested Code */}
          <div>
            <div className="bg-green-100 px-6 py-4 border-b-3 border-gray-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-bold text-black uppercase">Suggested Code</span>
              </div>
              <button
                onClick={() => copyToClipboard(suggestion.suggested, 'Suggested code')}
                className="bg-green-600 text-white px-3 py-2 border-2 border-gray-800 hover:bg-green-700 transition-colors font-bold text-xs uppercase flex items-center gap-2"
                title="Copy suggested code"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
            <div className="relative">
              <SyntaxHighlighter
                language={language}
                style={syntaxTheme}
                customStyle={{
                  margin: 0,
                  padding: '16px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  background: '#f0fdf4',
                  borderRadius: 0,
                }}
                showLineNumbers
                wrapLines
              >
                {suggestion.suggested}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component for displaying all code suggestions
interface CodeSuggestionsListProps {
  suggestions: CodeSuggestion[];
  theme?: 'light' | 'dark';
}

export const CodeSuggestionsList: React.FC<CodeSuggestionsListProps> = ({ 
  suggestions, 
  theme = 'light' 
}) => {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <GitCompare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Code Suggestions</h3>
        <p className="text-gray-500">
          No specific code improvements were identified for this pull request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-gray-100 p-6 border-3 border-gray-600">
        <h3 className="text-xl font-bold text-black flex items-center gap-3 uppercase">
          <GitCompare className="h-6 w-6 text-blue-600" />
          Code Suggestions ({suggestions.length})
        </h3>
        <div className="flex items-center gap-3">
          {suggestions.filter(s => s.severity === 'HIGH').length > 0 && (
            <Badge className="bg-red-600 text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
              {suggestions.filter(s => s.severity === 'HIGH').length} High Priority
            </Badge>
          )}
          {suggestions.filter(s => s.severity === 'MEDIUM').length > 0 && (
            <Badge className="bg-orange-600 text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
              {suggestions.filter(s => s.severity === 'MEDIUM').length} Medium Priority
            </Badge>
          )}
          {suggestions.filter(s => s.severity === 'LOW').length > 0 && (
            <Badge className="bg-green-600 text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
              {suggestions.filter(s => s.severity === 'LOW').length} Low Priority
            </Badge>
          )}
        </div>
      </div>
      
      <div className="space-y-8">
        {suggestions.map((suggestion, index) => (
          <CodeSuggestionCard
            key={index}
            suggestion={suggestion}
            index={index}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
};

export default CodeSuggestionsList;
