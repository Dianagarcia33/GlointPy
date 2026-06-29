import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home } from 'lucide-react';

export const Sidebar = () => {
    return (
        <aside className="w-64 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col h-[calc(100vh-4rem)] sticky top-16 shadow-2xl overflow-y-auto z-10 transition-all duration-300">
            <div className="flex flex-col py-6 px-4 gap-2">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Menú Principal
                </p>
                
                <NavLink
                    to="/dashboard"
                    end
                    className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                        ${isActive 
                            ? 'bg-brand-500/20 text-brand-400 shadow-md border border-brand-500/30' 
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
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
