// Indicador mostrado mientras se descarga el código de una página cargada en diferido (React.lazy)
export const PageLoader = () => (
  <div className="flex w-full flex-1 items-center justify-center py-24">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-transparent" />
  </div>
);
