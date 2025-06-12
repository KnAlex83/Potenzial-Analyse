import { useState } from "react";
import SurveyForm from "@/components/survey-form";
import ResultHigh from "./result-high";
import ResultLow from "./result-low";
import groviaLogo from "@/assets/grovia-logo.jpg";

export default function Survey() {
  const [showResult, setShowResult] = useState<{ show: boolean; scorePercentage: number }>({ 
    show: false, 
    scorePercentage: 0 
  });

  const handleSurveySuccess = (scorePercentage: number) => {
    setShowResult({ show: true, scorePercentage });
  };

  if (showResult.show) {
    return showResult.scorePercentage >= 50 
      ? <ResultHigh scorePercentage={showResult.scorePercentage} />
      : <ResultLow scorePercentage={showResult.scorePercentage} />;
  }

  return (
    <div className="min-h-screen bg-background-page" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Grovia Digital</h1>
              <p className="text-text-secondary mt-1">Personal Branding Masterclass</p>
            </div>
            <div className="flex-shrink-0">
              <img 
                src={groviaLogo} 
                alt="Grovia Digital Logo" 
                className="h-24 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <SurveyForm onSuccess={handleSurveySuccess} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-text-secondary">
            <p className="mb-2">&copy; 2024 Grovia Digital. Alle Rechte vorbehalten.</p>
            <div className="flex justify-center space-x-6 text-sm">
              <a href="#" className="hover:text-primary transition-colors">Datenschutz</a>
              <a href="#" className="hover:text-primary transition-colors">Impressum</a>
              <a href="#" className="hover:text-primary transition-colors">Kontakt</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
