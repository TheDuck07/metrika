import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';

interface OnboardingTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  badge: string;
  badgeColor: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  tips: string[];
  illustrationGradient: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    badge: 'Paso 1 de 4 • Bienvenida',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700',
    icon: 'storefront',
    title: '¡Bienvenido a Metrika!',
    subtitle: 'El control total de tu tienda en la palma de tu mano',
    description:
      'Metrika está diseñada especialmente para tienditas de barrio, almacenes y ferias de Bolivia. Olvídate de los cuadernos viejos y las cuentas confusas: aquí sabrás con certeza cuánto entra, cuánto sale y cuánto ganas cada día.',
    tips: [
      'Sin suscripciones raras: 100% fácil y adaptado a ti.',
      'Funciona en tu celular, tablet o computadora.',
      'Tus datos están protegidos y respaldados.',
    ],
    illustrationGradient: 'from-amber-500 via-orange-600 to-amber-700',
  },
  {
    badge: 'Paso 2 de 4 • Ventas Rápidas',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700',
    icon: 'mic',
    title: 'Anota Ventas y Gastos con la Voz 🎙️',
    subtitle: '¡No dejes de atender el mostrador!',
    description:
      'Ahora puedes dictar tus ventas usando el nuevo botón "Anotar por Voz con IA". Habla al micrófono de forma natural y la inteligencia artificial calculará el total en Bolivianos (Bs.) y lo registrará al instante.',
    tips: [
      'Ejemplo: "Venta de 2 Coca-Colas" o "Gasto 40 Bs de luz".',
      '¿Vendiste al fiado? Di: "Fiado de aceite a Don Pedro".',
      '¿Prefieres la cámara? Toca "Foto-Venta con IA" para escanear productos.',
    ],
    illustrationGradient: 'from-emerald-600 via-teal-600 to-emerald-800',
  },
  {
    badge: 'Paso 3 de 4 • Mercadería y Fiados',
    badgeColor: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/70 dark:text-orange-200 dark:border-orange-700',
    icon: 'inventory_2',
    title: 'Inventario y Ventas al Fiado 📦📒',
    subtitle: 'Ten siempre lo que tus clientes buscan',
    description:
      'Registra las compras a tus proveedores (Pil, Coca-Cola, embolsados) para saber cuánto te cuesta cada producto. Además, controla las deudas de tus vecinos para cobrarles a fin de mes sin olvidar ni un peso.',
    tips: [
      'Alarmas de poco stock te avisan antes de que se agote un producto.',
      'Calcula tu ganancia bruta comparando costo vs precio de venta.',
      'Sube tu código QR de Banco Unión/BCP para cobrar directo en pantalla.',
    ],
    illustrationGradient: 'from-orange-600 via-red-600 to-amber-700',
  },
  {
    badge: 'Paso 4 de 4 • Ganancias Reales',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-700',
    icon: 'trending_up',
    title: 'Ganancia Neta y Respaldo WhatsApp 📊📲',
    subtitle: 'Claridad financiera todos los días',
    description:
      'En la pestaña "Reportes" verás tu balance real: Ventas del día menos Compras y Gastos operativos. También puedes exportar tus cuentas a Excel o enviarte un resumen de seguridad a tu propio WhatsApp.',
    tips: [
      'Revisa el gráfico de ventas semanales y productos más vendidos.',
      'Exporta tu historial completo en formato Excel CSV con 1 toque.',
      'Activa el "Modo Oscuro" en la noche para descansar tu vista.',
    ],
    illustrationGradient: 'from-purple-600 via-indigo-600 to-purple-800',
  },
];

export const OnboardingTutorialModal: React.FC<OnboardingTutorialModalProps> = ({ isOpen, onClose }) => {
  const { storeInfo } = useStore();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('metrika_seen_tutorial', 'true');
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('metrika_seen_tutorial', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e1714] w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Top bar: Badge & Skip */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800/80">
          <span
            className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border ${step.badgeColor}`}
          >
            {step.badge}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Omitir
          </button>
        </div>

        {/* Hero Visual Card */}
        <div
          className={`mt-4 rounded-3xl p-6 bg-gradient-to-br ${step.illustrationGradient} text-white text-center shadow-lg relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]`}
        >
          {/* Subtle decorative circles */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-black/10 blur-xl"></div>

          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner mb-3">
            <span className="material-symbols-outlined text-4xl">{step.icon}</span>
          </div>

          <h3 className="text-xl font-black tracking-tight leading-snug drop-shadow-sm">
            {step.title}
          </h3>
          <p className="text-xs text-white/90 font-semibold mt-1">
            {step.subtitle}
          </p>
        </div>

        {/* Description & Tips */}
        <div className="mt-4 space-y-3 flex-1">
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
            {step.description}
          </p>

          <div className="bg-stone-50 dark:bg-[#271f1b] rounded-2xl p-3.5 border border-stone-200/80 dark:border-stone-800 space-y-2">
            <span className="text-[11px] font-black uppercase text-stone-500 dark:text-stone-400 tracking-wider block">
              💡 Consejos clave:
            </span>
            <ul className="space-y-1.5">
              {step.tips.map((tip, idx) => (
                <li
                  key={idx}
                  className="text-xs text-stone-700 dark:text-stone-300 flex items-start gap-2"
                >
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-sm shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-2 mt-5 mb-3">
          {TUTORIAL_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentStep === idx
                  ? 'w-6 bg-[#9f3c16] dark:bg-[#ff9973]'
                  : 'w-2 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400'
              }`}
              title={`Ir al paso ${idx + 1}`}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 flex items-center gap-2 border-t border-stone-100 dark:border-stone-800">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Anterior</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-[#bd532b] to-[#9f3c16] hover:from-[#c85a31] hover:to-[#a9431b] active:scale-98 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isLast ? `¡Empezar en ${storeInfo.name}! 🚀` : 'Siguiente'}</span>
            {!isLast && <span className="material-symbols-outlined text-base">arrow_forward</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

