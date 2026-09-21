import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, ArrowLeft, Loader2, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usersService } from '../../services/users';

export const ParentalBanner: React.FC = () => {
  const { user, parentBackup, login, setParentBackup } = useAuthStore();
  const [isSwitchingBack, setIsSwitchingBack] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // We are in parental mode if we have a parentBackup in store OR the user has a parent_user_id
  const isParentalMode = Boolean(parentBackup || user?.parent_user_id);

  if (!isParentalMode || !user) {
    return null;
  }

  const handleReturnToParent = async () => {
    setIsSwitchingBack(true);
    try {
      // Backend call sets the HttpOnly cookie for the parent
      const res = await usersService.switchBackToParent();
      login(res.user as any, res.access_token);
      setParentBackup(null);
      queryClient.clear();
      navigate('/dashboard');
    } catch (err: any) {
      if (parentBackup && parentBackup.token) {
        login(parentBackup.user, parentBackup.token);
        setParentBackup(null);
        queryClient.clear();
        navigate('/dashboard');
        return;
      }
      console.error('Error al retornar a la cuenta del tutor:', err);
      alert(err.message || 'No fue posible volver a la cuenta del tutor. Por favor inicia sesión nuevamente.');
    } finally {
      setIsSwitchingBack(false);
    }
  };

  return (
    <aside aria-label="Aviso de supervisión parental" className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-4 py-2 text-xs shadow-md border-b border-amber-500/40 relative z-40 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <div className="p-1 bg-amber-500/50 rounded-lg shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-100" />
          </div>
          <div>
            <span className="font-extrabold tracking-wide uppercase text-[10px] bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-400/30 mr-2">
              Supervisión Parental
            </span>
            <span className="text-amber-100">
              Estás supervisando la cuenta de tu hijo/a menor:{' '}
              <strong className="text-white font-bold underline decoration-amber-300 underline-offset-2">
                {user.name}
              </strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReturnToParent}
          disabled={isSwitchingBack}
          className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-950 font-bold rounded-xl text-xs shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
        >
          {isSwitchingBack ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
              <span>Cambiando...</span>
            </>
          ) : (
            <>
              <ArrowLeft className="w-3.5 h-3.5 text-amber-800" />
              <span>Volver a mi cuenta de tutor</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
