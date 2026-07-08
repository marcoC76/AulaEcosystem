import { cn } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, ReferenceLine,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

function cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface TimelineItem {
    name: string;
    asistencias?: number;
    asistenciasPrev?: number;
}

interface StatusDatum {
    name: string;
    value: number;
    color: string;
}

interface WeekdayDatum {
    name: string;
    faltas: number;
}

interface AulaLookChartsProps {
    timelineData: TimelineItem[];
    prevTimelineData: any[];
    totalItems: number;
    statusData: StatusDatum[];
    weekdayData: WeekdayDatum[];
    isFullscreen: boolean;
    toggleFullscreen: () => void;
    chartsContainerRef: React.RefObject<HTMLDivElement | null>;
}

export default function AulaLookCharts({
    timelineData, prevTimelineData, totalItems, statusData, weekdayData,
    isFullscreen, toggleFullscreen, chartsContainerRef,
}: AulaLookChartsProps) {
    if (timelineData.length === 0 && statusData.every(d => d.value === 0)) {
        return null;
    }

    return (
        <div ref={chartsContainerRef} className={cn("grid grid-cols-1 lg:grid-cols-4 gap-6 transition-all duration-300", isFullscreen && "p-8 bg-slate-900 overflow-y-auto w-full h-full z-[9999]")}>
            <Card className="lg:col-span-2 border-theme-border bg-theme-border/50 p-6 relative">
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10 no-print">
                    <Button variant="ghost" size="sm" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} className="text-theme-muted hover:text-theme-text h-8 w-8 p-0">
                        <span className="material-icons-round text-lg" aria-hidden="true">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                    </Button>
                </div>
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <span className="material-icons-round text-theme-accent1-400" aria-hidden="true">insights</span>
                    Tendencia de Asistencia
                </h2>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
                            <XAxis dataKey="name" stroke={cssVar('--theme-muted') || '#9ca3af'} tick={{ fill: cssVar('--theme-muted') || '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, Math.max(totalItems, 5)]} stroke={cssVar('--theme-muted') || '#9ca3af'} tick={{ fill: cssVar('--theme-muted') || '#9ca3af' }} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: cssVar('--theme-card') || '#1f2937', borderColor: cssVar('--theme-border') || '#374151', borderRadius: '8px', color: cssVar('--theme-text') || '#fff' }} />
                            <ReferenceLine y={totalItems * 0.85} stroke={cssVar('--theme-accent1-500') || '#ef4444'} strokeDasharray="3 3" label={{ position: 'top', value: 'Umbral 85%', fill: cssVar('--theme-accent1-500') || '#ef4444', fontSize: 12 }} />
                            <Line type="monotone" name="Período Actual" dataKey="asistencias" stroke={cssVar('--theme-accent1-500') || '#3b82f6'} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            {prevTimelineData.length > 0 && (
                                <Line type="monotone" name="Período Anterior" dataKey="asistenciasPrev" stroke={cssVar('--theme-accent3-500') || '#a855f7'} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>
            <Card className="border-theme-border bg-theme-border/50 p-6">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <span className="material-icons-round text-theme-accent2-400" aria-hidden="true">pie_chart</span>
                    Estatus
                </h2>
                <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: cssVar('--theme-card') || '#1f2937', borderColor: cssVar('--theme-border') || '#374151', borderRadius: '8px', color: cssVar('--theme-text') || '#fff' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
            <Card className="border-theme-border bg-theme-border/50 p-6">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <span className="material-icons-round text-theme-accent1-400" aria-hidden="true">warning</span>
                    Patrón
                </h2>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekdayData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
                            <XAxis dataKey="name" stroke={cssVar('--theme-muted') || '#9ca3af'} tick={{ fill: cssVar('--theme-muted') || '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <RechartsTooltip cursor={{ fill: cssVar('--theme-border') || '#374151', opacity: 0.4 }} contentStyle={{ backgroundColor: cssVar('--theme-card') || '#1f2937', borderColor: cssVar('--theme-border') || '#374151', borderRadius: '8px', color: cssVar('--theme-text') || '#fff' }} />
                            <Bar dataKey="faltas" fill={cssVar('--theme-accent1-500') || '#ef4444'} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
