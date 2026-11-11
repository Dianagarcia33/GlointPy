import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ArrowRight, Clock, Wallet, UserCheck, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useSarlaftStatus } from '../../../hooks/useSarlaftStatus';
import { SarlaftPendingModal } from '../components/SarlaftPendingModal';
import { investmentsService, Investment } from '../../../services/investments';
import { NewInvestmentModal } from '../components/NewInvestmentModal';

export const SKIP_ONBOARDING_KEY = 'gl_skip_first_investment_onboarding';

type StepState = 'done' | 'current' | 'todo' | 'blocked';

const Step = ({ icon, title, text, state }: { icon: React.ReactNode; title: string; text: string; state: StepState }) => {
    const ring =
        state === 'done' ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
        : state === 'current' ? 'bg-brand-50 text-brand-600 border-brand-200'
        : state === 'blocked' ? 'bg-rose-100 text-rose-600 border-rose-200'
        : 'bg-slate-100 text-slate-400 border-slate-200';
    return (
        <li className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${ring}`}>
                {state === 'done' ? <CheckCircle2 className="w-5 h-5" /> : icon}
            </div>
            <div className="pt-0.5">
                <p className={`text-sm font-bold ${state === 'todo' ? 'text-slate-400' : 'text-slate-900'}`}>{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
            </div>
        </li>
    );
};

/**
 * Pantalla posterior al registro: lleva al usuario paso a paso de la verificación de identidad
 * (SARLAFT) a su primera solicitud de inversión. La inversión solo se habilita cuando la
 * verificación se aprueba; mientras tanto el usuario ve el avance y no se pierde en el panel.
 */
export const FirstInvestmentOnboardingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { isApproved, isPending, isRejected, isLoading } = useSarlaftStatus();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const sawPending = useRef(false);
    const autoOpened = useRef(false);

    const { data: investments, isLoading: loadingInvestments } = useQuery<Investment[]>({
        queryKey: ['my_investments', user?.id],
        queryFn: async () => {
            const d = await investmentsService.getMyInvestments();
            return Array.isArray(d) ? d : [];
        },
        enabled: !!user?.id,
        staleTime: 30000,
    });

    // Si ya tiene una inversión o solicitud, esta pantalla no aplica
    useEffect(() => {
        if (!loadingInvestments && (investments?.length ?? 0) > 0) {
            navigate('/dashboard', { replace: true });
        }
    }, [loadingInvestments, investments, navigate]);

    useEffect(() => {
        if (isPending) sawPending.current = true;
    }, [isPending]);

    // Al aprobarse con la pantalla abierta, abrir la solicitud de inversión una sola vez
    useEffect(() => {
        if (isApproved && sawPending.current && !autoOpened.current) {
            autoOpened.current = true;
            setIsModalOpen(true);
        }
    }, [isApproved]);

    const goToDashboard = () => {
        try { sessionStorage.setItem(SKIP_ONBOARDING_KEY, '1'); } catch { /* sin storage */ }
        navigate('/dashboard');
    };

    const firstName = user?.name?.split(' ')[0] || '';
    const verifying = isLoading || isPending;

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            {isPending && !isLoading && <SarlaftPendingModal />}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8">
                <div className="mb-6">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-montserrat">
                        {firstName ? `¡Bienvenido, ${firstName}!` : '¡Bienvenido a GLOINT!'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Estás a un paso de crear tu primera inversión. Primero validamos tu identidad por normativa (SARLAFT).
                    </p>
                </div>

                <ol className="space-y-5 mb-8">
                    <Step
                        icon={<UserCheck className="w-5 h-5" />}
                        state="done"
                        title="Cuenta creada"
                        text="Recibimos tus datos y documentos."
                    />
                    <Step
                        icon={verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : isRejected ? <Clock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        state={isApproved ? 'done' : 'current'}
                        title={isApproved ? 'Identidad verificada' : isRejected ? 'Tu verificación está en revisión' : 'Verificando tu identidad'}
                        text={
                            isApproved
                                ? 'Todo en orden. Ya puedes invertir.'
                                : isRejected
                                ? 'Nuestro equipo de cumplimiento necesita revisar algunos datos. Te escribiremos pronto.'
                                : 'Consultamos listas restrictivas y antecedentes. Suele tardar pocos minutos.'
                        }
                    />
                    <Step
                        icon={<Wallet className="w-5 h-5" />}
                        state={isApproved ? 'current' : 'todo'}
                        title="Crea tu primera inversión"
                        text={isApproved ? 'Elige un plan, un periodo y envía tu comprobante.' : 'Se habilita cuando termine la verificación.'}
                    />
                </ol>

                {verifying && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6" role="status">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            Puedes quedarte en esta pantalla: apenas termine la verificación te mostraremos tu solicitud de inversión.
                            Si prefieres, ve al panel; también te avisaremos por correo.
                        </p>
                    </div>
                )}

                {isRejected && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 mb-6" role="status">
                        <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Tu inversión se habilitará cuando termine esta revisión. Si tienes dudas o quieres agilizarla, escríbenos desde soporte.
                        </p>
                    </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                        type="button"
                        onClick={goToDashboard}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                    >
                        Ir al panel
                    </button>
                    {isRejected && (
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/tickets')}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                        >
                            Escribir a soporte
                        </button>
                    )}
                    {/* La inversión solo se habilita con la verificación aprobada */}
                    <button
                        type="button"
                        disabled={!isApproved}
                        onClick={() => setIsModalOpen(true)}
                        className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                        Crear mi primera inversión <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <NewInvestmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => navigate('/dashboard', { replace: false })}
            />
        </div>
    );
};
