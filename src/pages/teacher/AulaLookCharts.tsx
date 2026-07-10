import React from 'react';
import { cn, cssVar } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ReferenceLine, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

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

interface MarkTypeDatum {
    name: string;
    value: number;
    color: string;
}

interface HistogramDatum {
    name: string;
    alumnos: number;
    color: string;
}

interface StreakDatum {
    label: string;
    alumnos: number;
    color: string;
}

interface AulaLookChartsProps {
    timelineData: TimelineItem[];
    prevTimelineData: any[];
    totalItems: number;
    statusData: StatusDatum[];
    weekdayData: WeekdayDatum[];
    markTypeData: MarkTypeDatum[];
    histogramData: HistogramDatum[];
    streakData: StreakDatum[];
    chartsContainerRef: React.RefObject<HTMLDivElement | null>;
}

function ChartCard({ children, className, ...rest }: { children: React.ReactNode; className?: string; [key: string]: any }) {
    return <Card className={cn("border-theme-border bg-theme-border/50 p-5 overflow-hidden", className)} {...rest}>{children}</Card>;
}

function ChartTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
    return (
        <h2 className="text-sm font-bold flex items-center gap-1.5">
            <span className="material-icons-round text-base shrink-0" aria-hidden="true">{icon}</span>
            <span className="truncate">{children}</span>
        </h2>
    );
}

const tooltipStyle = {
    backgroundColor: cssVar('--theme-card') || '#1f2937',
    borderColor: cssVar('--theme-border') || '#374151',
    borderRadius: '8px',
    color: cssVar('--theme-text') || '#fff',
    fontSize: 12,
};

export default function AulaLookCharts({
    timelineData, prevTimelineData, totalItems, statusData, weekdayData, markTypeData, histogramData, streakData,
    chartsContainerRef,
}: AulaLookChartsProps) {
    return (
        <div ref={chartsContainerRef} className="space-y-5">
            {/* ── Row 1: Tendencia + Patrón side by side ── */}
            <div className="flex flex-col lg:flex-row gap-5">
                <ChartCard className="flex-1 min-w-0">
                    <ChartTitle icon="insights">Tendencia de Asistencia</ChartTitle>
                    <div style={{ height: 250, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timelineData} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
<XAxis dataKey="name" stroke={cssVar('--theme-text') || '#f3f4f6'} tick={{ fill: cssVar('--theme-text') || '#f3f4f6', fontSize: 10, opacity: 0.85 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, Math.max(totalItems, 5)]} stroke={cssVar('--theme-text') || '#f3f4f6'} tick={{ fill: cssVar('--theme-text') || '#f3f4f6', fontSize: 10, opacity: 0.85 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip contentStyle={tooltipStyle} />
                                    <ReferenceLine y={totalItems * 0.85} stroke={cssVar('--theme-danger-500') || '#ef4444'} strokeDasharray="3 3" label={{ position: 'top', value: 'Umbral 85%', fill: cssVar('--theme-danger-500') || '#ef4444', fontSize: 11 }} />
                                    <Line type="monotone" name="Período Actual" dataKey="asistencias" stroke={cssVar('--theme-accent2-500') || '#10b981'} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    {prevTimelineData.length > 0 && (
                                        <Line type="monotone" name="Período Anterior" dataKey="asistenciasPrev" stroke={cssVar('--theme-accent3-500') || '#a855f7'} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                </ChartCard>
                <ChartCard className="w-full lg:w-[300px] xl:w-[340px] shrink-0">
                    <ChartTitle icon="warning">Patrón Semanal</ChartTitle>
                    <div style={{ height: 250, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weekdayData} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
<XAxis dataKey="name" stroke={cssVar('--theme-text') || '#f3f4f6'} tick={{ fill: cssVar('--theme-text') || '#f3f4f6', fontSize: 12, opacity: 0.85 }} axisLine={false} tickLine={false} />
                            <YAxis stroke={cssVar('--theme-text') || '#f3f4f6'} tick={{ fill: cssVar('--theme-text') || '#f3f4f6', fontSize: 11, opacity: 0.85 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip cursor={{ fill: cssVar('--theme-border') || '#374151', opacity: 0.4 }} contentStyle={tooltipStyle} />
                                <Bar dataKey="faltas" fill={cssVar('--theme-danger-500') || '#ef4444'} radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        </div>
                </ChartCard>
            </div>

            {/* ── Row 2: 4-column grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <ChartCard>
                    <ChartTitle icon="pie_chart">Estatus</ChartTitle>
                    <div style={{ height: 150, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none">
                                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={tooltipStyle} />
                            </PieChart>
                            </ResponsiveContainer>
                        </div>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-theme-text">
                        {statusData.map(s => (
                            <span key={s.name} className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                <span className="opacity-90">{s.name}</span>
                            </span>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard>
                    <ChartTitle icon="fact_check">Tipos de Marca</ChartTitle>
                    <div style={{ height: 150, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={markTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none">
                                    {markTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={tooltipStyle} />
                            </PieChart>
                            </ResponsiveContainer>
                        </div>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-theme-text">
                        {markTypeData.map(s => (
                            <span key={s.name} className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                <span className="opacity-90">{s.name}</span>
                            </span>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard>
                    <ChartTitle icon="trending_up">Rachas</ChartTitle>
                    <div style={{ height: 150, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={streakData} margin={{ top: 2, right: 2, bottom: 0, left: -14 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
                                <XAxis dataKey="label" stroke={cssVar('--theme-text') || '#f3f4f6'} tick={{ fill: cssVar('--theme-text') || '#f3f4f6', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                                <YAxis hide />
                                <RechartsTooltip cursor={{ fill: cssVar('--theme-border') || '#374151', opacity: 0.4 }} contentStyle={tooltipStyle} />
                                <Bar dataKey="alumnos" radius={[3, 3, 0, 0]}>
                                    {streakData.map((entry, index) => <Cell key={`sc-${index}`} fill={entry.color} />)}
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                        </div>
                    <p className="text-[10px] text-theme-text/80 text-center">Faltas consecutivas</p>
                </ChartCard>

                <ChartCard>
                    <ChartTitle icon="bar_chart">Distribución</ChartTitle>
                    <div style={{ height: 150, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={histogramData} margin={{ top: 2, right: 2, bottom: 0, left: -14 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
                                <XAxis dataKey="name" stroke={cssVar('--theme-text') || '#f3f4f6'} tick={{ fill: cssVar('--theme-text') || '#f3f4f6', fontSize: 8 }} axisLine={false} tickLine={false} interval={0} />
                                <YAxis hide />
                                <RechartsTooltip cursor={{ fill: cssVar('--theme-border') || '#374151', opacity: 0.4 }} contentStyle={tooltipStyle} />
                                <Bar dataKey="alumnos" radius={[2, 2, 0, 0]}>
                                    {histogramData.map((entry, index) => <Cell key={`hc-${index}`} fill={entry.color} />)}
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                        </div>
                    <p className="text-[10px] text-theme-text/80 text-center">% de asistencia</p>
                </ChartCard>
            </div>
        </div>
    );
}