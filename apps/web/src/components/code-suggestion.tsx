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
    <div className={`overflow-hidden border-2 sm:border-3 border-gray-600 bg-white mb-4 sm:mb-6`}>
      {/* Header - Responsive */}
      <div className="bg-gray-100 px-3 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-3 border-gray-600">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`${severityConfig.color} flex-shrink-0`}>
              {severityConfig.icon}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
              <Badge className={`${severityConfig.bgColor.replace('bg-', 'bg-')} ${severityConfig.color} px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800`}>
                {suggestion.severity}
              </Badge>
              <Badge className="bg-black text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800">
                {suggestion.category}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-black font-bold">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 w-full sm:w-auto">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <code className="font-mono bg-gray-200 px-1.5 sm:px-2 py-0.5 sm:py-1 border-2 border-gray-600 text-black font-bold text-xs truncate">
                {suggestion.file}
              </code>
            </div>
            {suggestion.line && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="bg-blue-600 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800 whitespace-nowrap">
                  Line {suggestion.line}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-0">
        {/* Description - Responsive */}
        <div className="p-3 sm:p-6 bg-white border-b-2 sm:border-b-3 border-gray-600">
          <div className="flex items-start gap-2 sm:gap-4">
            <GitCompare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mt-0.5 sm:mt-1 flex-shrink-0" />
            <div className="min-w-0">
              <h4 className="font-bold text-black text-sm sm:text-lg mb-2 sm:mb-3 uppercase">
                Suggestion #{index + 1}
              </h4>
              <p className="text-xs sm:text-sm text-black leading-relaxed font-medium">
                {suggestion.reason}
              </p>
            </div>
          </div>
        </div>

        {/* Code Comparison - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Current Code */}
          <div className="border-b-2 lg:border-b-0 lg:border-r-2 sm:lg:border-r-3 border-gray-600">
            <div className="bg-red-100 px-3 sm:px-6 py-2 sm:py-4 border-b-2 sm:border-b-3 border-gray-600 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-black uppercase">Current Code</span>
              </div>
              <button
                onClick={() => copyToClipboard(suggestion.original, 'Current code')}
                className="bg-red-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-gray-800 hover:bg-red-700 transition-colors font-bold text-xs uppercase flex items-center gap-1.5 sm:gap-2"
                title="Copy current code"
              >
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Copy</span>
              </button>
            </div>
            <div className="relative overflow-x-auto">
              <SyntaxHighlighter
                language={language}
                style={syntaxTheme}
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  background: '#fef2f2',
                  borderRadius: 0,
                }}
                showLineNumbers
                wrapLines
                className="text-xs sm:text-sm"
              >
                {suggestion.original}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* Suggested Code */}
          <div>
            <div className="bg-green-100 px-3 sm:px-6 py-2 sm:py-4 border-b-2 sm:border-b-3 border-gray-600 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-black uppercase">Suggested Code</span>
              </div>
              <button
                onClick={() => copyToClipboard(suggestion.suggested, 'Suggested code')}
                className="bg-green-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-gray-800 hover:bg-green-700 transition-colors font-bold text-xs uppercase flex items-center gap-1.5 sm:gap-2"
                title="Copy suggested code"
              >
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Copy</span>
              </button>
            </div>
            <div className="relative overflow-x-auto">
              <SyntaxHighlighter
                language={language}
                style={syntaxTheme}
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  background: '#f0fdf4',
                  borderRadius: 0,
                }}
                showLineNumbers
                wrapLines
                className="text-xs sm:text-sm"
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
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 bg-gray-100 p-3 sm:p-6 border-2 sm:border-3 border-gray-600">
        <h3 className="text-base sm:text-xl font-bold text-black flex items-center gap-2 sm:gap-3 uppercase">
          <GitCompare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
          <span className="truncate">Code Suggestions ({suggestions.length})</span>
        </h3>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {suggestions.filter(s => s.severity === 'HIGH').length > 0 && (
            <Badge className="bg-red-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800 whitespace-nowrap">
              {suggestions.filter(s => s.severity === 'HIGH').length} High
              <span className="hidden sm:inline"> Priority</span>
            </Badge>
          )}
          {suggestions.filter(s => s.severity === 'MEDIUM').length > 0 && (
            <Badge className="bg-orange-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800 whitespace-nowrap">
              {suggestions.filter(s => s.severity === 'MEDIUM').length} Medium
              <span className="hidden sm:inline"> Priority</span>
            </Badge>
          )}
          {suggestions.filter(s => s.severity === 'LOW').length > 0 && (
            <Badge className="bg-green-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800 whitespace-nowrap">
              {suggestions.filter(s => s.severity === 'LOW').length} Low
              <span className="hidden sm:inline"> Priority</span>
            </Badge>
          )}
        </div>
      </div>
      
      <div className="space-y-4 sm:space-y-8">
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
