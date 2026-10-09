import React from 'react';
import { NavLink } from 'react-router-dom';
import { Package, Truck, ShoppingCart, Laptop, ExternalLink } from 'lucide-react';
import { Can } from '../../../components/security/Can';

interface CorporateResourceNavProps {
  activeTab: 'inventory' | 'suppliers' | 'purchase_orders' | 'assets';
}

export const CorporateResourceNav: React.FC<CorporateResourceNavProps> = ({ activeTab }) => {
  const tabs = [
    {
      id: 'inventory',
      label: 'Inventario & Kardex',
      path: '/dashboard/inventory',
      icon: Package,
      permissions: ['inventory:view', 'inventory.view'],
      description: 'Stock, insumos y catálogo',
    },
    {
      id: 'suppliers',
      label: 'Proveedores',
      path: '/dashboard/suppliers',
      icon: Truck,
      permissions: ['suppliers:view', 'suppliers.view', 'inventory:view'],
      description: 'Directorio y condiciones',
    },
    {
      id: 'purchase_orders',
      label: 'Órdenes de Compra',
      path: '/dashboard/purchase-orders',
      icon: ShoppingCart,
      permissions: ['purchase_orders:view', 'purchase_orders.view', 'inventory:view'],
      description: 'Aprobaciones y recepciones',
    },
    {
      id: 'assets',
      label: 'Activos Fijos',
      path: '/dashboard/assets',
      icon: Laptop,
      permissions: ['assets:view', 'assets.view', 'inventory:view'],
      description: 'Equipos y custodia',
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs mb-6">
      <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="Módulos Corporativos">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <Can key={tab.id} permissions={tab.permissions}>
              <NavLink
                to={tab.path}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 select-none ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25 ring-1 ring-brand-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="leading-tight font-medium">{tab.label}</span>
                  <span
                    className={`text-[10px] hidden md:inline-block leading-none mt-0.5 ${
                      isActive ? 'text-brand-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {tab.description}
                  </span>
                </div>
              </NavLink>
            </Can>
          );
        })}
      </nav>
    </div>
  );
};
