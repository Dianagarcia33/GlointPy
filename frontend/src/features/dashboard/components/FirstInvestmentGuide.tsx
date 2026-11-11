import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useSarlaftStatus } from '../../../hooks/useSarlaftStatus';
import { NewInvestmentModal } from './NewInvestmentModal';

interface FirstInvestmentGuideProps {
    /** Cantidad de inversiones que ya tiene el usuario. La guía solo aplica con 0. */
    investmentsCount: number;
}

const dismissKey = (userId?: number | string) => `gl_first_investment_guide_dismissed_${userId ?? 'anon'}`;

const readDismissed = (userId?: number | string): boolean => {
    try {
        return sessionStorage.getItem(dismissKey(userId)) === '1';
    } catch {
        return false;
    }
};

/**
 * Guía de primera inversión: cuando la verificación SARLAFT termina bien y el usuario
 * aún no tiene inversiones, le avisa y lo lleva directo a crear la primera.
 * Si estaba mirando el dashboard mientras la verificación corría (polling), abre el
 * modal automáticamente en el momento exacto en que se habilita, para que no se pierda.
 */
export const FirstInvestmentGuide: React.FC<FirstInvestmentGuideProps> = ({ investmentsCount }) => {
    const { user } = useAuthStore();
    const { isApproved, isPending, isLoading } = useSarlaftStatus();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dismissed, setDismissed] = useState(() => readDismissed(user?.id));
    const sawPending = useRef(false);
    const autoOpened = useRef(false);

    useEffect(() => {
        if (isPending) sawPending.current = true;
    }, [isPending]);

    // Transición pendiente -> aprobado con la pantalla abierta: abrir el modal una sola vez
    useEffect(() => {
        if (
            isApproved &&
            sawPending.current &&
            !autoOpened.current &&
            !dismissed &&
            investmentsCount === 0
        ) {
            autoOpened.current = true;
            setIsModalOpen(true);
        }
    }, [isApproved, dismissed, investmentsCount]);

    const dismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem(dismissKey(user?.id), '1');
        } catch {
            /* sin storage: solo se oculta durante esta sesión */
        }
    };

    const showBanner = !isLoading && isApproved && investmentsCount === 0 && !dismissed;

    return (
        <>
            {showBanner && (
                <div
                    role="status"
                    className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-300/80 rounded-3xl p-5 sm:p-6 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 mt-0.5">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-900 text-[10px] font-extrabold uppercase rounded-full border border-emerald-500/30">
                                    Verificación aprobada
                                </span>
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base font-montserrat">
                                    ¡Tu cuenta está lista para invertir!
                                </h4>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                                Terminamos de validar tu identidad. El siguiente paso es crear tu primera inversión: elige un plan, un periodo y envía tu comprobante de pago.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                            type="button"
                            onClick={dismiss}
                            className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-xl transition-colors"
                        >
                            Más tarde
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Crear mi primera inversión
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            <NewInvestmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={dismiss}
            />
        </>
    );
};
