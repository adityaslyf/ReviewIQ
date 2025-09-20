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
    <div className="space-y-8">
      {/* Security Concerns */}
      {securityConcerns.length > 0 && (
        <div className="bg-white border-3 border-gray-600 mb-8">
          <div className="bg-red-100 px-6 py-4 border-b-3 border-gray-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-red-600" />
              <h4 className="font-bold text-black text-xl uppercase">Security Concerns</h4>
            </div>
            <Badge className="bg-red-600 text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
              {securityConcerns.length} Issue{securityConcerns.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="p-6 space-y-4">
            {securityConcerns.map((concern, index) => (
              <div key={index} className="flex items-start gap-4 py-3">
                <div className="flex items-center justify-center w-8 h-8 bg-red-600 text-white font-bold text-sm border-2 border-gray-800 flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-base text-black leading-relaxed font-semibold">{concern}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Impact */}
      {performanceImpact && (
        <div className="bg-white border-3 border-gray-600 mb-8">
          <div className="bg-orange-100 px-6 py-4 border-b-3 border-gray-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-orange-600" />
              <h4 className="font-bold text-black text-xl uppercase">Performance Impact</h4>
            </div>
            <Badge className="bg-orange-600 text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
              Analysis
            </Badge>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4 py-3">
              <div className="flex items-center justify-center w-8 h-8 bg-orange-600 text-white font-bold text-sm border-2 border-gray-800 flex-shrink-0">
                1
              </div>
              <p className="text-base text-black leading-relaxed font-semibold">{performanceImpact}</p>
            </div>
          </div>
        </div>
      )}

      {/* Testing Recommendations */}
      {testingRecommendations.length > 0 && (
        <div className="bg-white border-3 border-gray-600 mb-8">
          <div className="bg-blue-100 px-6 py-4 border-b-3 border-gray-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TestTube className="h-6 w-6 text-blue-600" />
              <h4 className="font-bold text-black text-xl uppercase">Testing Recommendations</h4>
            </div>
            <Badge className="bg-blue-600 text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
              {testingRecommendations.length} Recommendation{testingRecommendations.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="p-6 space-y-4">
            {testingRecommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-4 py-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white font-bold text-sm border-2 border-gray-800 flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-base text-black leading-relaxed font-semibold">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architectural Notes */}
      {architecturalNotes.length > 0 && (
        <div className="bg-white border-3 border-gray-600 mb-8">
          <div className="bg-purple-100 px-6 py-4 border-b-3 border-gray-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-purple-600" />
              <h4 className="font-bold text-black text-xl uppercase">Architectural Notes</h4>
            </div>
            <Badge className="bg-purple-600 text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
              {architecturalNotes.length} Note{architecturalNotes.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="p-6 space-y-4">
            {architecturalNotes.map((note, index) => (
              <div key={index} className="flex items-start gap-4 py-3">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white font-bold text-sm border-2 border-gray-800 flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-base text-black leading-relaxed font-semibold">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisSections;
