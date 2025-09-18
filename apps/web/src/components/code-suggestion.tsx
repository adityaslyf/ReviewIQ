import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
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
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
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
    <Card className={`overflow-hidden border ${severityConfig.borderColor} ${severityConfig.bgColor}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${severityConfig.color}`}>
              {severityConfig.icon}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={severityConfig.variant} className="text-xs font-medium">
                {suggestion.severity}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {suggestion.category}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span className="font-mono">{suggestion.file}</span>
            {suggestion.line && (
              <>
                <MapPin className="h-4 w-4" />
                <span>Line {suggestion.line}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-0">
        {/* Description */}
        <div className="p-4 bg-white">
          <div className="flex items-start gap-3">
            <GitCompare className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Suggestion #{index + 1}
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {suggestion.reason}
              </p>
            </div>
          </div>
        </div>

        {/* Code Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border-t border-gray-200">
          {/* Current Code */}
          <div className="border-r border-gray-200">
            <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Current Code</span>
              </div>
              <button
                onClick={() => copyToClipboard(suggestion.original)}
                className="text-red-600 hover:text-red-800 transition-colors"
                title="Copy current code"
              >
                <Copy className="h-4 w-4" />
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
            <div className="bg-green-50 px-4 py-2 border-b border-green-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Suggested Code</span>
              </div>
              <button
                onClick={() => copyToClipboard(suggestion.suggested)}
                className="text-green-600 hover:text-green-800 transition-colors"
                title="Copy suggested code"
              >
                <Copy className="h-4 w-4" />
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
    </Card>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-blue-500" />
          Code Suggestions ({suggestions.length})
        </h3>
        <div className="flex items-center gap-2">
          {suggestions.filter(s => s.severity === 'HIGH').length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {suggestions.filter(s => s.severity === 'HIGH').length} High Priority
            </Badge>
          )}
          {suggestions.filter(s => s.severity === 'MEDIUM').length > 0 && (
            <Badge variant="default" className="text-xs">
              {suggestions.filter(s => s.severity === 'MEDIUM').length} Medium Priority
            </Badge>
          )}
          {suggestions.filter(s => s.severity === 'LOW').length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {suggestions.filter(s => s.severity === 'LOW').length} Low Priority
            </Badge>
          )}
        </div>
      </div>
      
      <div className="space-y-6">
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
