import { CheckCircle } from "lucide-react";
import groviaLogo from "@/assets/grovia-logo.jpg";

export default function Success() {
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

      {/* Progress Bar - 100% */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="w-full bg-gray-200 rounded-full h-2 relative">
            <div className="bg-primary h-2 rounded-full transition-all duration-300 ease-out w-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Vielen Dank!</h2>
            <p className="text-text-secondary mb-6">
              Deine Antworten wurden erfolgreich übermittelt. Wir werden uns in Kürze bei dir melden.
            </p>
            <p className="text-sm text-text-secondary">
              Du erhältst in den nächsten Minuten eine Bestätigungs-E-Mail mit weiteren Informationen zur Personal Branding Masterclass.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border">
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
