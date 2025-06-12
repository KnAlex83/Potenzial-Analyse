import groviaLogo from "@/assets/grovia-logo.jpg";

interface ResultHighProps {
  scorePercentage: number;
}

export default function ResultHigh({ scorePercentage }: ResultHighProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src={groviaLogo} 
            alt="Grovia Digital" 
            className="h-20 w-auto"
          />
        </div>

        {/* Success Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Herzlichen Glückwunsch!
        </h1>

        <h2 className="text-xl font-semibold text-primary mb-6">
          Du hast das Potenzial durchzustarten!
        </h2>

        {/* Score Display */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-6">
          <p className="text-lg text-gray-700 mb-2">
            Dein Ergebnis:
          </p>
          <div className="text-4xl font-bold text-primary mb-2">
            {scorePercentage}%
          </div>
          <p className="text-gray-600">
            Durch die Masterclass können wir dich auf 100% bringen
          </p>
        </div>

        {/* Call to Action */}
        <div className="space-y-4">
          <p className="text-gray-700 text-lg leading-relaxed">
            Du zeigst bereits starkes Potenzial für erfolgreiches Personal Branding. 
            Mit der richtigen Strategie und unserem bewährten System wirst du deine 
            Ziele noch schneller erreichen.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-yellow-800">
              <strong>Was passiert als nächstes?</strong><br />
              Unser Team wird sich in den nächsten 24 Stunden bei dir melden, 
              um deine Personal Branding Strategie zu besprechen und dir zu zeigen, 
              wie du dein volles Potenzial ausschöpfen kannst.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            © 2024 Grovia Digital - Personal Branding Masterclass
          </p>
        </div>
      </div>
    </div>
  );
}