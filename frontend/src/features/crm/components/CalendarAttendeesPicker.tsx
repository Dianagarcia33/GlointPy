import React, { useMemo, useState } from 'react';
import { Mail, UserPlus, X } from 'lucide-react';
import { CalendarEventAttendee, CalendarTeamMember } from '../../../services/crmCalendarService';

const EMAIL_RE = /^[^@\s<>"',;:]+@[^@\s<>"',;:]+\.[^@\s<>"',;:]+$/;

interface Props {
  team: CalendarTeamMember[];
  value: CalendarEventAttendee[];
  onChange: (next: CalendarEventAttendee[]) => void;
  maxAttendees?: number;
}

/**
 * Invitados de una cita: se eligen miembros del equipo desde la lista o se escribe
 * cualquier correo externo (Enter, coma o espacio lo agregan).
 */
export const CalendarAttendeesPicker: React.FC<Props> = ({ team, value, onChange, maxAttendees = 50 }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(() => new Set(value.map(a => a.email.toLowerCase())), [value]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return team
      .filter(m => !selected.has(m.email.toLowerCase()))
      .filter(m => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [team, selected, query]);

  const add = (attendee: CalendarEventAttendee) => {
    const email = attendee.email.trim().toLowerCase();
    if (selected.has(email)) {
      setQuery('');
      return;
    }
    if (value.length >= maxAttendees) {
      setError(`Máximo ${maxAttendees} invitados por cita.`);
      return;
    }
    onChange([...value, { name: attendee.name?.trim() || email, email }]);
    setQuery('');
    setError('');
  };

  /** Agrega lo escrito como correo externo. Devuelve false si no es un correo válido. */
  const commitTyped = (): boolean => {
    const typed = query.trim().replace(/[,;]$/, '');
    if (!typed) return true;
    if (!EMAIL_RE.test(typed)) {
      setError('Escribe un correo válido o elige a alguien del equipo.');
      return false;
    }
    const member = team.find(m => m.email.toLowerCase() === typed.toLowerCase());
    add(member ? { name: member.name, email: member.email } : { name: typed, email: typed });
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || (e.key === ' ' && query.includes('@'))) {
      e.preventDefault();
      // Con un solo resultado del equipo y sin correo escrito, Enter elige a esa persona
      if (e.key === 'Enter' && !query.includes('@') && suggestions.length === 1 && query.trim()) {
        add({ name: suggestions[0].name, email: suggestions[0].email });
        return;
      }
      commitTyped();
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div
        className="w-full min-h-[38px] px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-brand-500 focus-within:bg-white transition-all flex flex-wrap items-center gap-1.5"
        onClick={() => setOpen(true)}
      >
        {value.map(a => {
          const isTeam = team.some(m => m.email.toLowerCase() === a.email.toLowerCase());
          return (
            <span
              key={a.email}
              title={a.email}
              className={`inline-flex items-center gap-1 max-w-full pl-2 pr-1 py-0.5 rounded-lg text-[11px] font-semibold border ${
                isTeam
                  ? 'bg-brand-50 text-brand-700 border-brand-200/70'
                  : 'bg-amber-50 text-amber-800 border-amber-200/70'
              }`}
            >
              {isTeam ? <UserPlus className="w-3 h-3 shrink-0" /> : <Mail className="w-3 h-3 shrink-0" />}
              <span className="truncate">{a.name && a.name !== a.email ? a.name : a.email}</span>
              <button
                type="button"
                aria-label={`Quitar a ${a.name || a.email}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter(v => v.email !== a.email));
                }}
                className="p-0.5 rounded hover:bg-black/10 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <input
          type="text"
          value={query}
          placeholder={value.length === 0 ? 'Busca a alguien del equipo o escribe un correo…' : 'Agregar otro…'}
          aria-label="Agregar invitado"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setError('');
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // El retraso deja que el clic sobre una sugerencia alcance a registrarse
            setTimeout(() => setOpen(false), 150);
            if (query.includes('@')) commitTyped();
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[140px] bg-transparent py-0.5 px-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1">
          {suggestions.map(m => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add({ name: m.name, email: m.email })}
                className="w-full text-left px-3 py-1.5 hover:bg-brand-50 cursor-pointer flex items-center justify-between gap-3"
              >
                <span className="text-xs font-semibold text-slate-800 truncate">{m.name}</span>
                <span className="text-[10px] text-slate-400 truncate">{m.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-[10px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
};
