import { useCallback, useRef, useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { QuestionsPanel } from './QuestionsPanel';

type Tab = 'chat' | 'preguntas';

/**
 * Un solo panel de participación para los virtuales: pestañas Chat | Preguntas.
 * La pestaña Chat aparece solo cuando el equipo enciende el chat (y desaparece si lo apaga).
 * Los dos paneles quedan montados y solo se ocultan, para no perder mensajes ni la conexión al cambiar de pestaña.
 */
export function ParticipationPanel({ token }: { token: string }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('preguntas');
  const userChose = useRef(false);

  const onChatOpenChange = useCallback((open: boolean) => {
    setChatOpen(open);
    if (!open) setTab((t) => (t === 'chat' ? 'preguntas' : t));
    else if (!userChose.current) setTab('chat'); // al encenderse el chat, se muestra salvo que ya hayan elegido otra cosa
  }, []);

  const pick = (t: Tab) => { userChose.current = true; setTab(t); };

  const tabs: { key: Tab; label: string }[] = [
    ...(chatOpen ? [{ key: 'chat' as Tab, label: 'Chat en vivo' }] : []),
    { key: 'preguntas', label: 'Preguntas' },
  ];

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      <div role="tablist" aria-label="Participación" className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button key={t.key} role="tab" type="button" id={`part-tab-${t.key}`} aria-selected={tab === t.key}
            aria-controls={`part-panel-${t.key}`} onClick={() => pick(t.key)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px ${tab === t.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="part-panel-chat" aria-labelledby="part-tab-chat" className={`mt-4 ${tab === 'chat' && chatOpen ? '' : 'hidden'}`}>
        <ChatPanel token={token} embedded onChatOpenChange={onChatOpenChange} />
      </div>
      <div role="tabpanel" id="part-panel-preguntas" aria-labelledby="part-tab-preguntas" className={`mt-4 ${tab === 'preguntas' ? '' : 'hidden'}`}>
        <QuestionsPanel token={token} embedded />
      </div>
    </section>
  );
}
