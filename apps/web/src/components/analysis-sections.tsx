import React from 'react';
import { Badge } from './ui/badge';
import { 
  Shield, 
  Zap, 
  TestTube, 
  Building2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';

interface AnalysisSectionsProps {
  securityConcerns?: string[];
  performanceImpact?: string;
  testingRecommendations?: string[];
  architecturalNotes?: string[];
}

export const AnalysisSections: React.FC<AnalysisSectionsProps> = ({
  securityConcerns = [],
  performanceImpact,
  testingRecommendations = [],
  architecturalNotes = []
}) => {
  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Security Concerns - Responsive */}
      {securityConcerns.length > 0 && (
        <div className="bg-white border-2 sm:border-3 border-gray-600 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-red-100 px-3 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-3 border-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 flex-shrink-0" />
              <h4 className="font-bold text-black text-sm sm:text-base lg:text-xl uppercase">Security Concerns</h4>
            </div>
            <Badge className="bg-red-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800 self-start whitespace-nowrap">
              {securityConcerns.length} Issue{securityConcerns.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
            {securityConcerns.map((concern, index) => (
              <div key={index} className="flex items-start gap-2 sm:gap-4 py-2 sm:py-3">
                <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-red-600 text-white font-bold text-xs sm:text-sm border-2 border-gray-800 flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-black leading-relaxed font-semibold">{concern}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Impact - Responsive */}
      {performanceImpact && (
        <div className="bg-white border-2 sm:border-3 border-gray-600 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-orange-100 px-3 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-3 border-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 flex-shrink-0" />
              <h4 className="font-bold text-black text-sm sm:text-base lg:text-xl uppercase">Performance Impact</h4>
            </div>
            <Badge className="bg-orange-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800 self-start whitespace-nowrap">
              Analysis
            </Badge>
          </div>
          <div className="p-3 sm:p-6">
            <div className="flex items-start gap-2 sm:gap-4 py-2 sm:py-3">
              <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-orange-600 text-white font-bold text-xs sm:text-sm border-2 border-gray-800 flex-shrink-0">
                1
              </div>
              <p className="text-xs sm:text-sm lg:text-base text-black leading-relaxed font-semibold">{performanceImpact}</p>
            </div>
          </div>
        </div>
      )}

      {/* Testing Recommendations - Responsive */}
      {testingRecommendations.length > 0 && (
        <div className="bg-white border-2 sm:border-3 border-gray-600 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-blue-100 px-3 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-3 border-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <TestTube className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
              <h4 className="font-bold text-black text-sm sm:text-base lg:text-xl uppercase">Testing Recommendations</h4>
            </div>
            <Badge className="bg-blue-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800 self-start whitespace-nowrap">
              {testingRecommendations.length} Rec{testingRecommendations.length > 1 ? 's' : ''}
              <span className="hidden sm:inline">ommendation{testingRecommendations.length > 1 ? 's' : ''}</span>
            </Badge>
          </div>
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
            {testingRecommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-2 sm:gap-4 py-2 sm:py-3">
                <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 text-white font-bold text-xs sm:text-sm border-2 border-gray-800 flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-black leading-relaxed font-semibold">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architectural Notes - Responsive */}
      {architecturalNotes.length > 0 && (
        <div className="bg-white border-2 sm:border-3 border-gray-600 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-purple-100 px-3 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-3 border-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 flex-shrink-0" />
              <h4 className="font-bold text-black text-sm sm:text-base lg:text-xl uppercase">Architectural Notes</h4>
            </div>
            <Badge className="bg-purple-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold border-2 border-gray-800 self-start whitespace-nowrap">
              {architecturalNotes.length} Note{architecturalNotes.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
            {architecturalNotes.map((note, index) => (
              <div key={index} className="flex items-start gap-2 sm:gap-4 py-2 sm:py-3">
                <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-purple-600 text-white font-bold text-xs sm:text-sm border-2 border-gray-800 flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-black leading-relaxed font-semibold">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisSections;
