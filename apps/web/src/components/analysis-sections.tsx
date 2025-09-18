import React from 'react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
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
    <div className="space-y-6">
      {/* Security Concerns */}
      {securityConcerns.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold text-red-900">Security Concerns</h4>
              <Badge variant="destructive" className="text-xs">
                {securityConcerns.length} Issue{securityConcerns.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-3">
              {securityConcerns.map((concern, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800 leading-relaxed">{concern}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Performance Impact */}
      {performanceImpact && (
        <Card className="border-orange-200 bg-orange-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-orange-600" />
              <h4 className="font-semibold text-orange-900">Performance Impact</h4>
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                Analysis
              </Badge>
            </div>
            <div className="p-3 bg-white rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-orange-800 leading-relaxed">{performanceImpact}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Testing Recommendations */}
      {testingRecommendations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TestTube className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Testing Recommendations</h4>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                {testingRecommendations.length} Recommendation{testingRecommendations.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-2">
              {testingRecommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800 leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Architectural Notes */}
      {architecturalNotes.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-purple-900">Architectural Notes</h4>
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                {architecturalNotes.length} Note{architecturalNotes.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-2">
              {architecturalNotes.map((note, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200">
                  <Lightbulb className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-purple-800 leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnalysisSections;
