import { useState, useEffect } from 'react';

const STORAGE_KEY = 'cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-4">
      <div className="mx-auto max-w-lg bg-theme-card/95 backdrop-blur-md border border-theme-border rounded-2xl p-4 shadow-2xl">
        <p className="text-sm text-theme-text leading-relaxed mb-3">
          Este sitio utiliza cookies para mejorar tu experiencia. Al continuar, aceptas su uso conforme a nuestra política de privacidad.
        </p>
        <button
          onClick={accept}
          className="w-full py-2.5 bg-theme-accent1-600 hover:brightness-110 text-white font-semibold rounded-xl text-sm transition-all active:scale-95"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
