import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Wallet, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Lock, 
  Building2, 
  Clock, 
  ArrowLeft,
  DollarSign,
  Receipt,
  Sparkles
} from 'lucide-react';
import { externalAppsService, CheckoutOrderInfo } from '../../../services/externalApps';
import { useAuthStore } from '../../../store/authStore';
import { formatCurrency } from '../../../utils/format';
import { walletService } from '../../dashboard/api/walletService';
import { fetchApi } from '../../../services/api';

export const GlointPayCheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const { user, isAuthenticated, login: loginAction } = useAuthStore();
  const [order, setOrder] = useState<CheckoutOrderInfo | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment process state
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    message: string;
    amount_paid: number;
    new_wallet_balance: number;
    redirect_url?: string | null;
  } | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Login form state if not authenticated
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      const data = await walletService.getMyBalance();
      setWalletBalance(Number(data.balance) || 0);
    } catch (err: any) {
      console.error('Error fetching user wallet balance:', err);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Token de pago ausente o inválido.');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const orderData = await externalAppsService.getCheckoutOrderInfo(token);
        setOrder(orderData);
      } catch (err: any) {
        console.error('Error fetching checkout order:', err);
        setError(err.message || 'La orden de pago no existe o ha expirado.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [token]);

  // Fetch logged in user wallet balance
  useEffect(() => {
    if (isAuthenticated) {
      fetchWallet();
    }
  }, [isAuthenticated]);

  // Auto redirect countdown on success
  useEffect(() => {
    if (paymentSuccess && paymentSuccess.redirect_url) {
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            window.location.href = paymentSuccess.redirect_url!;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [paymentSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginLoading(true);
      setLoginError(null);
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const loggedUser = data.user;
      if (loggedUser) {
        const perms = new Set<string>();
        const rolesList = new Set<string>();
        if (loggedUser.roles) {
          loggedUser.roles.forEach((r: any) => {
            rolesList.add(r.name);
            if (r.permissions) {
              r.permissions.forEach((p: any) => perms.add(p.name));
            }
          });
        }
        loggedUser.permissions = Array.from(perms);
        loggedUser.roles_list = Array.from(rolesList);
      }

      loginAction(
        loggedUser || { id: 1, name: loginEmail.split('@')[0], email: loginEmail, is_active: true }, 
        data.access_token
      );
      fetchWallet();
    } catch (err: any) {
      setLoginError(err.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order) return;

    try {
      setIsPaying(true);
      setError(null);
      const res = await externalAppsService.confirmCheckoutPayment(order.payment_token);
      setPaymentSuccess({
        message: res.message,
        amount_paid: res.amount_paid,
        new_wallet_balance: res.new_wallet_balance,
        redirect_url: res.redirect_url
      });
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      setError(err.message || 'Error al procesar el pago con saldo de billetera.');
    } finally {
      setIsPaying(false);
    }
  };

  const orderAmount = order?.amount || 0;
  const hasSufficientBalance = walletBalance >= orderAmount;
  const balanceAfterPayment = Math.max(0, walletBalance - orderAmount);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative overflow-hidden font-sans">
      {/* Background glow accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        
        {/* Gloint Pay Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-400 block font-mono">
                Pasarela Oficial
              </span>
              <h1 className="text-xl font-black font-montserrat tracking-tight text-white flex items-center gap-1.5">
                GLOINT <span className="text-amber-400">PAY</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>256-bit SSL</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
            <p className="text-xs font-bold text-slate-400">Cargando orden de pago...</p>
          </div>
        ) : error && !paymentSuccess ? (
          <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>No se pudo procesar la orden</span>
            </div>
            <p className="text-rose-300/80">{error}</p>
          </div>
        ) : paymentSuccess ? (
          /* Payment Success State */
          <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black font-montserrat text-white">¡Pago Exitoso!</h2>
              <p className="text-xs text-slate-400">Se debitó correctamente de tu billetera Gloint.</p>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Comercio:</span>
                <strong className="text-white">{order?.app_name}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Referencia:</span>
                <span className="font-mono text-white font-bold">{order?.order_reference}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Monto Pagado:</span>
                <strong className="text-emerald-400 font-bold">{formatCurrency(paymentSuccess.amount_paid)}</strong>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-700 pt-2">
                <span>Nuevo Saldo Disponible:</span>
                <span className="font-mono font-bold text-slate-200">{formatCurrency(paymentSuccess.new_wallet_balance)}</span>
              </div>
            </div>

            {paymentSuccess.redirect_url ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-400">
                  Redirigiendo a <strong className="text-white">{order?.app_name}</strong> en {redirectCountdown}s...
                </p>
                <a
                  href={paymentSuccess.redirect_url}
                  className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                >
                  <span>Volver al comercio ahora</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>Ir a mi Dashboard</span>
              </button>
            )}
          </div>
        ) : order ? (
          /* Checkout Payment Flow */
          <div className="space-y-5">
            {/* Merchant & Order Details Card */}
            <div className="p-4 bg-slate-800/50 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Comercio Solicitante
                </span>
                <span className="text-[10px] font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                  Ref: {order.order_reference}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black font-montserrat text-white">{order.app_name}</h3>
                {order.description && (
                  <p className="text-xs text-slate-400 mt-0.5">{order.description}</p>
                )}
              </div>
              <div className="pt-2 border-t border-slate-700/60 flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Total a Pagar:</span>
                <div className="text-2xl font-black font-montserrat text-amber-400">
                  {formatCurrency(order.amount)}
                </div>
              </div>
            </div>

            {/* Authentication Step if Not Logged In */}
            {!isAuthenticated ? (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white font-montserrat">Inicia sesión en tu cuenta Gloint</h4>
                  <p className="text-xs text-slate-400">Ingresa tus credenciales para autorizar el cobro con tu billetera.</p>
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Contraseña"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Acceder y Continuar</span>}
                  </button>
                </form>
              </div>
            ) : (
              /* User is Authenticated -> Show Wallet & Confirm Button */
              <div className="space-y-4 pt-2 border-t border-slate-800">
                {/* User Info & Available Balance */}
                <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Inversionista:</span>
                    <strong className="text-white font-montserrat">{user?.name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-brand-400" /> Saldo Disponible en Billetera:
                    </span>
                    <strong className={`font-mono font-bold ${hasSufficientBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(walletBalance)}
                    </strong>
                  </div>

                  {hasSufficientBalance ? (
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Saldo posterior al pago:</span>
                      <span className="font-mono text-slate-200 font-bold">{formatCurrency(balanceAfterPayment)}</span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-[11px] font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>Saldo insuficiente para completar esta compra.</span>
                    </div>
                  )}
                </div>

                {/* Confirm & Pay Button */}
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={!hasSufficientBalance || isPaying}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Procesando pago seguro...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pagar {formatCurrency(order.amount)} con Saldo Gloint</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer Security Badges */}
        <div className="pt-2 text-center text-[10px] text-slate-500 space-y-1">
          <p>Transacción segura procesada y respaldada por la bóveda de Gloint.</p>
        </div>

      </div>
    </div>
  );
};
