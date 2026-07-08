import { cn } from '../../lib/utils';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { ConfigOption, ParcialConfig } from '../../types';
import type { StudentSearchResult } from '../../lib/search';

interface AulaLookFiltersProps {
    mode: 'group' | 'student';
    setMode: (m: 'group' | 'student') => void;
    step: number;
    config: { profesores: ConfigOption[]; materias: ConfigOption[] };
    selectedTeacher: string;
    setSelectedTeacher: (v: string) => void;
    selectedSubject: string;
    setSelectedSubject: (v: string) => void;
    selectedGroups: string[];
    setSelectedGroups: (v: string[] | ((prev: string[]) => string[])) => void;
    selectedPeriod: string;
    setSelectedPeriod: (v: string) => void;
    parciales: ParcialConfig[];
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    showSuggestions: boolean;
    setShowSuggestions: (v: boolean) => void;
    selectedSearchStudent: StudentSearchResult | null;
    setSelectedSearchStudent: (v: StudentSearchResult | null) => void;
    suggestions: StudentSearchResult[];
    studentsDB: any[];
    availableGroups: string[];
    handleNext: () => void;
    handleBack: () => void;
}

export default function AulaLookFilters({
    mode, setMode, step, config,
    selectedTeacher, setSelectedTeacher,
    selectedSubject, setSelectedSubject,
    selectedGroups, setSelectedGroups,
    selectedPeriod, setSelectedPeriod,
    parciales, searchQuery, setSearchQuery,
    showSuggestions, setShowSuggestions,
    selectedSearchStudent, setSelectedSearchStudent,
    suggestions, studentsDB, availableGroups,
    handleNext, handleBack,
}: AulaLookFiltersProps) {
    const formatGroupLabel = (label: string) => {
        return label
            .replace(/radiolog[íi]a/gi, 'RAD')
            .replace(/enfermer[íi]a/gi, 'ENF')
            .replace(/programaci[óo]n/gi, 'PROG')
            .replace(/mantenimiento/gi, 'MANT')
            .replace(/electricidad/gi, 'ELEC')
            .replace(/administraci[óo]n/gi, 'ADM');
    };

    const badgeColors = [
        { active: "bg-theme-accent1-500/20 border-theme-accent1-500 text-theme-accent1-400", hover: "hover:bg-theme-accent1-500/10" },
        { active: "bg-theme-accent2-500/20 border-theme-accent2-500 text-theme-accent2-400", hover: "hover:bg-theme-accent2-500/10" },
        { active: "bg-theme-accent3-500/20 border-theme-accent3-500 text-theme-accent3-400", hover: "hover:bg-theme-accent3-500/10" },
        { active: "bg-theme-warning-500/20 border-theme-warning-500 text-theme-warning-400", hover: "hover:bg-theme-warning-500/10" },
        { active: "bg-theme-accent1-500/20 border-theme-accent1-500 text-theme-accent1-400", hover: "hover:bg-theme-accent1-500/10" },
        { active: "bg-theme-accent2-500/20 border-theme-accent2-500 text-theme-accent2-400", hover: "hover:bg-theme-accent2-500/10" },
        { active: "bg-theme-accent3-500/20 border-theme-accent3-500 text-theme-accent3-400", hover: "hover:bg-theme-accent3-500/10" },
        { active: "bg-theme-warning-500/20 border-theme-warning-500 text-theme-warning-400", hover: "hover:bg-theme-warning-500/10" },
        { active: "bg-theme-accent1-500/20 border-theme-accent1-500 text-theme-accent1-400", hover: "hover:bg-theme-accent1-500/10" },
        { active: "bg-theme-accent2-500/20 border-theme-accent2-500 text-theme-accent2-400", hover: "hover:bg-theme-accent2-500/10" }
    ];

    return (
        <div className="max-w-4xl mx-auto mt-6 animate-fade-in-up transition-all duration-500">
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex gap-1 p-0.5 bg-theme-card/80 backdrop-blur-xl rounded-xl border border-theme-border">
                    <button
                        className={cn("px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2", mode === 'group' ? "bg-theme-accent1-600 text-white shadow-sm" : "text-theme-muted hover:text-theme-text")}
                        onClick={() => { setMode('group'); setSelectedSearchStudent(null); }}
                    >
                        <span className="material-icons-round text-lg">groups</span> Grupo
                    </button>
                    <button
                        className={cn("px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2", mode === 'student' ? "bg-theme-accent1-600 text-white shadow-sm" : "text-theme-muted hover:text-theme-text")}
                        onClick={() => { setMode('student'); }}
                    >
                        <span className="material-icons-round text-lg">person_search</span> Alumno
                    </button>
                </div>

                {mode === 'group' && (
                    <div className="flex items-center gap-1.5 ml-1">
                        {['Profesor', 'Materia', 'Grupo', 'Resultados'].map((label, i) => (
                            <div key={label} className="flex items-center">
                                <div className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                                    i === step ? "bg-theme-accent1-600/20 text-theme-accent1-400" : "text-theme-muted/60"
                                )}
                                    aria-current={i === step ? 'step' : undefined}>
                                    {label}
                                </div>
                                {i < 3 && <span className="text-theme-muted/20 text-xs mx-0.5">›</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {step === 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="flex items-center gap-3 bg-theme-card/50 rounded-xl px-4 py-3">
                        <span className="material-icons-round text-lg text-theme-accent1-400">school</span>
                        <div>
                            <p className="text-xs text-theme-muted font-semibold">Alumnos</p>
                            <p className="text-lg font-bold tabular-nums">{studentsDB.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-theme-card/50 rounded-xl px-4 py-3">
                        <span className="material-icons-round text-lg text-theme-accent2-400">groups</span>
                        <div>
                            <p className="text-xs text-theme-muted font-semibold">Grupos</p>
                            <p className="text-lg font-bold tabular-nums">{availableGroups.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-theme-card/50 rounded-xl px-4 py-3">
                        <span className="material-icons-round text-lg text-theme-warning-400">auto_stories</span>
                        <div>
                            <p className="text-xs text-theme-muted font-semibold">Materias</p>
                            <p className="text-lg font-bold tabular-nums">{config.materias.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-theme-card/50 rounded-xl px-4 py-3">
                        <span className="material-icons-round text-lg text-theme-accent2-400">person_4</span>
                        <div>
                            <p className="text-xs text-theme-muted font-semibold">Profesores</p>
                            <p className="text-lg font-bold tabular-nums">{config.profesores.length}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-theme-card/80 backdrop-blur-xl rounded-3xl shadow-[var(--shadow-card)] p-6">
                <div className="min-h-[160px] flex flex-col justify-center transition-all duration-300">
                    {mode === 'group' && (
                        <>
                            {step === 0 && (
                                <div className="space-y-3 animate-fade-in">
                                    <Select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                                        <option value="">-- Elige un profesor --</option>
                                        {config.profesores.map(p => <option key={p.value} value={p.text}>{p.text}</option>)}
                                    </Select>
                                </div>
                            )}
                            {step === 1 && (
                                <div className="space-y-3 animate-fade-in">
                                    <Select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                                        <option value="">-- Elige una materia --</option>
                                        {config.materias.map(m => <option key={m.value} value={m.text}>{m.text}</option>)}
                                    </Select>
                                </div>
                            )}
                            {step === 2 && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider block mb-2">Grupos</label>
                                        <div className="flex flex-wrap gap-2">
                                            {availableGroups.map((g, idx) => {
                                                const isSelected = selectedGroups.includes(g);
                                                const colorScheme = badgeColors[idx % badgeColors.length];
                                                return (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedGroups(prev =>
                                                                prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                                                            );
                                                        }}
                                                        className={cn(
                                                            "px-3 min-h-[44px] rounded-full border text-xs font-semibold cursor-pointer select-none transition-all duration-200 flex items-center gap-1",
                                                            isSelected
                                                                ? cn("shadow-sm", colorScheme.active)
                                                                : cn("bg-theme-border/20 border-theme-border text-theme-muted hover:bg-theme-border/40 hover:text-theme-text", colorScheme.hover)
                                                        )}
                                                    >
                                                        {isSelected && <span className="material-icons-round text-xs">check</span>}
                                                        <span className="truncate">{formatGroupLabel(g)}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {parciales.length > 0 && (
                                        <div>
                                            <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider block mb-2">Periodo</label>
                                            <Select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                                                {parciales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {mode === 'student' && step === 0 && (
                        <div className="space-y-4 animate-fade-in">
                            <p className="text-sm text-theme-muted">Ingresa el nombre o número de control para ver su historial en todas sus materias.</p>

                            <div className="relative">
                                <Input
                                    placeholder="Ej. Juan Pérez o 203040..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="pl-10"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-lg text-theme-muted">search</span>

                                {showSuggestions && searchQuery.length > 1 && (
                                    <div className="absolute top-full mt-2 left-0 right-0 bg-theme-card border border-theme-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                        {suggestions.length > 0 ? suggestions.map(s => (
                                            <button
                                                key={s.control}
                                                type="button"
                                                className="w-full text-left p-3 hover:bg-theme-base border-b border-theme-border flex flex-col transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setSelectedSearchStudent(s);
                                                    setSearchQuery(s.nombre);
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <span className="text-sm text-theme-text font-medium">{s.nombre}</span>
                                                <span className="text-xs text-theme-accent1-400 font-mono mt-0.5">{s.control}</span>
                                            </button>
                                        )) : (
                                            <div className="p-3 text-theme-muted text-center text-sm italic">No se encontraron alumnos.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedSearchStudent && (
                                <div className="flex items-center gap-3 p-3 bg-theme-accent1-500/10 rounded-xl animate-fade-in">
                                    <span className="material-icons-round text-2xl text-theme-accent1-400">account_circle</span>
                                    <div>
                                        <p className="text-sm font-medium text-theme-text">{selectedSearchStudent.nombre}</p>
                                        <p className="text-xs text-theme-muted font-mono">{selectedSearchStudent.control}</p>
                                    </div>
                                </div>
                            )}

                            {selectedSearchStudent && parciales.length > 0 && (
                                <div>
                                    <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider block mb-2">Periodo</label>
                                    <Select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                                        {parciales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-theme-border">
                    {step > 0 && (
                        <Button variant="ghost" onClick={handleBack} className="text-theme-muted">
                            Atrás
                        </Button>
                    )}
                    <Button onClick={handleNext}>
                        {mode === 'group' && step === 2 ? 'Generar Reporte' : mode === 'student' && step === 0 ? 'Generar Reporte' : 'Siguiente'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
