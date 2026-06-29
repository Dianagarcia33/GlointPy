import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home } from 'lucide-react';

export const Sidebar = () => {
    return (
        <aside className="w-64 flex flex-col h-full overflow-y-auto z-10 transition-all duration-300">
            <div className="flex flex-col py-6 px-4 gap-2">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Menú Principal
                </p>
                
                <NavLink
                    to="/dashboard"
                    end
                    className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-semibold text-sm
                        ${isActive 
                            ? 'bg-brand-50 text-brand-600' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <Home className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                    <span className="font-medium">Inicio</span>
                </NavLink>
            </div>
        </aside>
    );
};
