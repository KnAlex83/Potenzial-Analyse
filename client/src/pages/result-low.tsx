import groviaLogo from "@/assets/grovia-logo.jpg";

interface ResultLowProps {
  scorePercentage: number;
}

export default function ResultLow({ scorePercentage }: ResultLowProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src={groviaLogo} 
            alt="Grovia Digital" 
            className="h-20 w-auto"
          />
        </div>

        {/* Thank You Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Vielen Dank für deine Teilnahme!
        </h1>

        <h2 className="text-xl font-semibold text-gray-700 mb-6">
          Wir werden uns bei dir melden
        </h2>

        {/* Score Display */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 mb-6">
          <p className="text-lg text-gray-700 mb-2">
            Dein aktuelles Ergebnis:
          </p>
          <div className="text-3xl font-bold text-gray-600 mb-2">
            {scorePercentage}%
          </div>
          <p className="text-gray-600">
            Es gibt noch ungenutztes Potenzial zu entdecken
          </p>
        </div>

        {/* Information */}
        <div className="space-y-4">
          <p className="text-gray-700 text-lg leading-relaxed">
            Deine Antworten zeigen, dass du auf einem guten Weg bist, aber noch 
            weitere Schritte benötigst, um dein volles Personal Branding Potenzial 
            zu entfalten.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-800">
              <strong>Was passiert als nächstes?</strong><br />
              Unser Team wird sich in den kommenden Tagen bei dir melden, 
              um zu besprechen, wie wir dir helfen können, deine Personal Branding 
              Ziele zu erreichen und dein Potenzial zu maximieren.
            </p>
          </div>

          <div className="mt-6">
            <p className="text-gray-600">
              Personal Branding ist ein Prozess - und jeder Weg beginnt mit dem ersten Schritt. 
              Wir freuen uns darauf, dich auf deiner Reise zu begleiten.
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