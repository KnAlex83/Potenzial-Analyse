import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertSurveyResponseSchema, type InsertSurveyResponse } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface SurveyFormProps {
  onSuccess: (scorePercentage: number) => void;
}

// Scoring system - points for each option
const SCORING = {
  question1: { option1: 1, option2: 2, option3: 3, option4: 4 },
  question2: { option1: 1, option2: 2, option3: 3, option4: 4 },
  question3: { option1: 5, option2: 4, option3: 3, option4: 2, option5: 1 },
  question4: { option1: 5, option2: 4, option3: 3, option4: 2, option5: 1 },
  question5: { option1: 4, option2: 3, option3: 2, option4: 1 },
  question6: { option1: 3, option2: 2, option3: 1 },
  question7: { option1: 4, option2: 3, option3: 2, option4: 1 },
  question8: { option1: 3, option2: 2, option3: 1 }
};

const MAX_SCORE = 30; // Total possible points

export default function SurveyForm({ onSuccess }: SurveyFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const totalSteps = 9; // 8 questions + contact info

  const form = useForm<InsertSurveyResponse>({
    resolver: zodResolver(insertSurveyResponseSchema),
    defaultValues: {
      question1: undefined,
      question2: undefined,
      question3: undefined,
      question4: undefined,
      question5: undefined,
      question6: undefined,
      question7: undefined,
      question8: undefined,
      firstName: "",
      email: "",
    },
  });

  const calculateScore = (data: InsertSurveyResponse) => {
    let totalScore = 0;
    totalScore += SCORING.question1[data.question1] || 0;
    totalScore += SCORING.question2[data.question2] || 0;
    totalScore += SCORING.question3[data.question3] || 0;
    totalScore += SCORING.question4[data.question4] || 0;
    totalScore += SCORING.question5[data.question5] || 0;
    totalScore += SCORING.question6[data.question6] || 0;
    totalScore += SCORING.question7[data.question7] || 0;
    totalScore += SCORING.question8[data.question8] || 0;
    
    const percentage = Math.round((totalScore / MAX_SCORE) * 100);
    return { totalScore, percentage };
  };

  const submitMutation = useMutation({
    mutationFn: async (data: InsertSurveyResponse) => {
      const { totalScore, percentage } = calculateScore(data);
      return await apiRequest("POST", "/api/survey", { 
        ...data, 
        totalScore, 
        scorePercentage: percentage 
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Erfolgreich gesendet",
        description: "Deine Umfrage wurde erfolgreich übermittelt.",
      });
      const { totalScore, percentage } = calculateScore(form.getValues());
      onSuccess(percentage);
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Senden der Umfrage",
        variant: "destructive",
      });
    },
  });

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    const values = form.getValues();
    switch (currentStep) {
      case 1: return values.question1 !== undefined;
      case 2: return values.question2 !== undefined;
      case 3: return values.question3 !== undefined;
      case 4: return values.question4 !== undefined;
      case 5: return values.question5 !== undefined;
      case 6: return values.question6 !== undefined;
      case 7: return values.question7 !== undefined;
      case 8: return values.question8 !== undefined;
      case 9: return values.firstName?.trim().length > 0 && values.email?.trim().length > 0;
      default: return false;
    }
  };

  const onSubmit = (data: InsertSurveyResponse) => {
    submitMutation.mutate(data);
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <>
      {/* Progress indicator header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-text-secondary">Schritt {currentStep} von {totalSteps}</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Question 1 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Wie viele unentdeckte Chancen oder ideale Kunden vermutest, verpasst du aktuell, weil deine Expertise online noch nicht sichtbar ist?
                </h2>
                <FormField
                  control={form.control}
                  name="question1"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option1" id="q1-option1" />
                            <Label htmlFor="q1-option1" className="text-base cursor-pointer">
                              Kaum – ich starte gerade erst
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option2" id="q1-option2" />
                            <Label htmlFor="q1-option2" className="text-base cursor-pointer">
                              Einige – ich spüre, dass mehr möglich wäre
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option3" id="q1-option3" />
                            <Label htmlFor="q1-option3" className="text-base cursor-pointer">
                              Viele! Ich ahne, wieviel Potenzial brachliegt
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option4" id="q1-option4" />
                            <Label htmlFor="q1-option4" className="text-base cursor-pointer">
                              Massive Mengen – es hält mein Business zurück
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className={`px-8 py-3 font-medium transition-colors ${
                    canProceedToNext() 
                      ? "bg-primary hover:bg-primary/90 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Question 2 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Wie viele Stunden wirst du WÖCHENTLICH investieren, um nach der Masterclass SOFORT Ergebnisse zu sehen?
                </h2>
                <FormField
                  control={form.control}
                  name="question2"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option1" id="q2-option1" />
                            <Label htmlFor="q2-option1" className="text-base cursor-pointer">
                              &lt; 2h (riskiert Stillstand)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option2" id="q2-option2" />
                            <Label htmlFor="q2-option2" className="text-base cursor-pointer">
                              2-4h (Minimalaufwand für erste Schritte)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option3" id="q2-option3" />
                            <Label htmlFor="q2-option3" className="text-base cursor-pointer">
                              5-8h (ideales Tempo für spürbare Veränderung)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option4" id="q2-option4" />
                            <Label htmlFor="q2-option4" className="text-base cursor-pointer">
                              &gt; 8h (Turbo-Transformation möglich)
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="px-8 py-3 font-medium"
                >
                  Zurück
                </Button>
                <Button 
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className={`px-8 py-3 font-medium transition-colors ${
                    canProceedToNext() 
                      ? "bg-primary hover:bg-primary/90 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Question 3 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Was ist dein konkretes 3-Monats-Ziel, das dich JETZT antreibt?
                </h2>
                <FormField
                  control={form.control}
                  name="question3"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option1" id="q3-option1" />
                            <Label htmlFor="q3-option1" className="text-base cursor-pointer">
                              🔥 Exakt messbar & terminiert (z.B. "Bis 30.09. 15 Leads/Monat via LinkedIn")
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option2" id="q3-option2" />
                            <Label htmlFor="q3-option2" className="text-base cursor-pointer">
                              ✅ Klarer Fokus (z.B. "Mein Webinar bis August launchbereit haben")
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option3" id="q3-option3" />
                            <Label htmlFor="q3-option3" className="text-base cursor-pointer">
                              🟡 Teilweise konkret (z.B. "Mehr Sichtbarkeit in meiner Branche")
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option4" id="q3-option4" />
                            <Label htmlFor="q3-option4" className="text-base cursor-pointer">
                              ⚠️ Vage (z.B. "Beruflich durchstarten")
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option5" id="q3-option5" />
                            <Label htmlFor="q3-option5" className="text-base cursor-pointer">
                              ❌ Kein Ziel / unsicher
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="px-8 py-3 font-medium"
                >
                  Zurück
                </Button>
                <Button 
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className={`px-8 py-3 font-medium transition-colors ${
                    canProceedToNext() 
                      ? "bg-primary hover:bg-primary/90 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Question 4 */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Was ist deine große Vision für die nächsten 1-2 Jahre, wenn dein Personal Branding FUNKTIONIERT?
                </h2>
                <FormField
                  control={form.control}
                  name="question4"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option1" id="q4-option1" />
                            <Label htmlFor="q4-option1" className="text-base cursor-pointer">
                              🌟 Klare Skalierung (z.B. "Als Top-Expert:in bekannt, 50% mehr Umsatz automatisiert")
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option2" id="q4-option2" />
                            <Label htmlFor="q4-option2" className="text-base cursor-pointer">
                              🚀 Wachstum mit Plan (z.B. "Team aufbauen, internationale Kund:innen")
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option3" id="q4-option3" />
                            <Label htmlFor="q4-option3" className="text-base cursor-pointer">
                              ⏱️ Stabilisierung (z.B. "Konstante Anfragen ohne Akquise")
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option4" id="q4-option4" />
                            <Label htmlFor="q4-option4" className="text-base cursor-pointer">
                              🔍 Unklar (z.B. "Finanziell besser dastehen")
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option5" id="q4-option5" />
                            <Label htmlFor="q4-option5" className="text-base cursor-pointer">
                              ❌ Keine Vision
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="px-8 py-3 font-medium"
                >
                  Zurück
                </Button>
                <Button 
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className={`px-8 py-3 font-medium transition-colors ${
                    canProceedToNext() 
                      ? "bg-primary hover:bg-primary/90 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Question 5 */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Wie sehr stimmst du zu: 'Personal Branding ist HEUTE unverzichtbar, um ohne Dauer-Akquise Wunschkunden anzuziehen'?
                </h2>
                <FormField
                  control={form.control}
                  name="question5"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option1" id="q5-option1" />
                            <Label htmlFor="q5-option1" className="text-base cursor-pointer">
                              Stimme VOLL zu (erkenne den systemischen Hebel)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option2" id="q5-option2" />
                            <Label htmlFor="q5-option2" className="text-base cursor-pointer">
                              Stimme zu (sehe den Trend)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option3" id="q5-option3" />
                            <Label htmlFor="q5-option3" className="text-base cursor-pointer">
                              Neutral
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option4" id="q5-option4" />
                            <Label htmlFor="q5-option4" className="text-base cursor-pointer">
                              Stimme nicht zu (glaube an veraltete Methoden)
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="px-8 py-3 font-medium"
                >
                  Zurück
                </Button>
                <Button 
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className={`px-8 py-3 font-medium transition-colors ${
                    canProceedToNext() 
                      ? "bg-primary hover:bg-primary/90 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Question 6 */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Wie sicher bist du, dass du die Masterclass-Strategien SOFORT umsetzt?
                </h2>
                <FormField
                  control={form.control}
                  name="question6"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option1" id="q6-option1" />
                            <Label htmlFor="q6-option1" className="text-base cursor-pointer">
                              💯 Starte direkt durch – ich will keine Zeit verlieren!
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option2" id="q6-option2" />
                            <Label htmlFor="q6-option2" className="text-base cursor-pointer">
                              ✅ Werde viel umsetzen (ggf. mit Support)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option3" id="q6-option3" />
                            <Label htmlFor="q6-option3" className="text-base cursor-pointer">
                              ⏸️ Brauche erst externe Motivation
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="px-8 py-3 font-medium"
                >
                  Zurück
                </Button>
                <Button 
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className={`px-8 py-3 font-medium transition-colors ${
                    canProceedToNext() 
                      ? "bg-primary hover:bg-primary/90 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Question 7 */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Wie sehr WILLST du deine aktuelle Situation verändern – auch wenn es kurzfristig Energie kostet?
                </h2>
                <FormField
                  control={form.control}
                  name="question7"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option1" id="q7-option1" />
                            <Label htmlFor="q7-option1" className="text-base cursor-pointer">
                              Extrem! Ich bin bereit für den nächsten Level-Sprung
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option2" id="q7-option2" />
                            <Label htmlFor="q7-option2" className="text-base cursor-pointer">
                              Sehr – ich spüre die Dringlichkeit
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option3" id="q7-option3" />
                            <Label htmlFor="q7-option3" className="text-base cursor-pointer">
                              Mittel – aber ich zögere noch
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option4" id="q7-option4" />
                            <Label htmlFor="q7-option4" className="text-base cursor-pointer">
                              Gering – ich warte lieber ab
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="px-8 py-3 font-medium"
                >
                  Zurück
                </Button>
                <Button 
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className={`px-8 py-3 font-medium transition-colors ${
                    canProceedToNext() 
                      ? "bg-primary hover:bg-primary/90 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Question 8 */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Bist du bereit, in deine Freiheit zu investieren? 500€ für Systeme + Community, die dir Kunden bringen, während andere noch kämpfen:
                </h2>
                <FormField
                  control={form.control}
                  name="question8"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option1" id="q8-option1" />
                            <Label htmlFor="q8-option1" className="text-base cursor-pointer">
                              JA – ich will JETZT durchstarten!
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option2" id="q8-option2" />
                            <Label htmlFor="q8-option2" className="text-base cursor-pointer">
                              Vielleicht – brauche Details zum ROI
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="option3" id="q8-option3" />
                            <Label htmlFor="q8-option3" className="text-base cursor-pointer">
                              Nein – ich unterschätze noch den Hebel
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="px-8 py-3 font-medium"
                >
                  Zurück
                </Button>
                <Button 
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className={`px-8 py-3 font-medium transition-colors ${
                    canProceedToNext() 
                      ? "bg-primary hover:bg-primary/90 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Contact Information */}
          {currentStep === 9 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-6">
                  Kontaktinformationen
                </h2>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="firstName" className="text-base font-medium">
                          Vorname *
                        </Label>
                        <FormControl>
                          <Input
                            {...field}
                            id="firstName"
                            placeholder="Dein Vorname"
                            className="mt-2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="email" className="text-base font-medium">
                          E-Mail-Adresse *
                        </Label>
                        <FormControl>
                          <Input
                            {...field}
                            id="email"
                            type="email"
                            placeholder="deine@email.com"
                            className="mt-2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="px-8 py-3 font-medium"
                >
                  Zurück
                </Button>
                <Button 
                  type="submit"
                  disabled={!canProceedToNext() || submitMutation.isPending}
                  className={`px-8 py-3 font-medium transition-colors ${
                    canProceedToNext() && !submitMutation.isPending 
                      ? "bg-primary hover:bg-primary/90 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {submitMutation.isPending ? "Wird gesendet..." : "Senden"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Form>
    </>
  );
}
