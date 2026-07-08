import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { ExtendedAttendanceRecord, ParcialConfig } from '../../types';
import type { StudentSearchResult } from '../../lib/search';

applyPlugin(jsPDF);

// ── CSV ──

export function downloadReportCSV(
    mode: 'group' | 'student',
    data: ExtendedAttendanceRecord[],
    studentModeData: ExtendedAttendanceRecord[],
    selectedGroups: string[],
    selectedSubject: string,
    selectedSearchStudent: StudentSearchResult | null
): void {
    const d = mode === 'group' ? data : studentModeData;
    const headers = mode === 'group'
        ? ['Control', 'Nombre', 'Grupo', 'Clases Totales', 'Asistencias', 'Porcentaje']
        : ['Materia', 'Profesor', 'Clases Totales', 'Asistencias', 'Porcentaje'];

    const rows = d.map(item => {
        if (mode === 'group') {
            return [
                item['Número de Control'],
                item['Nombre del Alumno'],
                item.Grupo,
                item['Total de Clases'],
                item.Asistencias,
                `${(item.Porcentaje * 100).toFixed(0)}%`
            ];
        }
        return [
            item.Materia,
            item.Profesor,
            item['Total de Clases'],
            item.Asistencias,
            `${(item.Porcentaje * 100).toFixed(0)}%`
        ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = mode === 'group'
        ? `Reporte_${selectedGroups.join('_')}_${selectedSubject.substring(0, 10)}.csv`
        : `Reporte_${selectedSearchStudent?.nombre}_Multiple.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

export function downloadAbsenceReportCSV(
    mode: 'group' | 'student',
    data: ExtendedAttendanceRecord[],
    studentModeData: ExtendedAttendanceRecord[],
    selectedGroups: string[],
    selectedSearchStudent: StudentSearchResult | null
): void {
    const d = mode === 'group' ? data : studentModeData;
    if (d.length === 0) return;

    const headers = mode === 'group'
        ? ["Control", "Alumno", "Grupo", "Clases Impartidas", "Asistencias", "Porcentaje (%)", "Total Faltas", "Fechas Ausentes"]
        : ["Materia", "Profesor", "Grupo", "Clases Impartidas", "Asistencias", "Porcentaje (%)", "Total Faltas", "Fechas Ausentes"];

    const rows = d.map(item => {
        const faltasArr = item.faltasCalculadas || [];
        const fechasFaltas = faltasArr.join(" | ");
        const porcentaje = Math.round((item.Porcentaje || 0) * 100);

        if (mode === 'group') {
            return [
                item['Número de Control'],
                `"${item['Nombre del Alumno']}"`,
                item.Grupo,
                item['Total de Clases'] || 0,
                item.Asistencias || 0,
                porcentaje,
                faltasArr.length,
                `"${fechasFaltas}"`
            ].join(",");
        }
        return [
            `"${item.Materia}"`,
            `"${item.Profesor}"`,
            item.Grupo,
            item['Total de Clases'] || 0,
            item.Asistencias || 0,
            porcentaje,
            faltasArr.length,
            `"${fechasFaltas}"`
        ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `ReporteFaltas_${mode === 'group' ? selectedGroups.join('_') : selectedSearchStudent?.nombre}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ── PDF Kárdex / Reporte ──

export async function exportPDFReport(
    mode: 'group' | 'student',
    data: ExtendedAttendanceRecord[],
    studentModeData: ExtendedAttendanceRecord[],
    selectedGroups: string[],
    selectedSearchStudent: StudentSearchResult | null,
    selectedTeacher: string,
    selectedSubject: string,
    selectedPeriod: string,
    parciales: ParcialConfig[]
): Promise<void> {
    const d = mode === 'group' ? data : studentModeData;
    if (d.length === 0) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const periodName = parciales.find(p => p.id === selectedPeriod)?.nombre || `Parcial ${selectedPeriod}`;
    const title = mode === 'group' ? 'Reporte de Asistencia' : 'Kárdex de Asistencia';
    const subtitle = mode === 'group'
        ? `${selectedTeacher} • ${selectedSubject} • ${selectedGroups.join(', ')}`
        : `${selectedSearchStudent?.nombre} • Control: ${selectedSearchStudent?.control}`;

    // ── Header ──
    pdf.setFontSize(16);
    pdf.setTextColor(122, 28, 49);
    pdf.text('CETIS No. 76', margin, y);
    y += 6;
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Control de Asistencias - Sistema AulaEcosystem', margin, y);
    y += 10;

    pdf.setFontSize(14);
    pdf.setTextColor(30, 30, 30);
    pdf.text(title, margin, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(subtitle, margin, y);
    y += 5;
    pdf.text(`Período: ${periodName}`, margin, y);
    y += 12;

    // ── KPI Summary ──
    const totalItems = d.length;
    const totalAsistencias = d.reduce((sum, item) => sum + (item.Asistencias || 0), 0);
    const avgAttendance = totalItems ? d.reduce((sum, item) => sum + (item.Porcentaje || 0), 0) / totalItems : 0;
    const atRisk = d.filter(item => (item.Porcentaje || 0) < 0.8).length;
    const kpiData = [
        { label: mode === 'group' ? 'Alumnos' : 'Materias', value: totalItems },
        { label: 'Asistencias', value: totalAsistencias },
        { label: 'Promedio', value: `${(avgAttendance * 100).toFixed(1)}%` },
        { label: 'En Riesgo', value: atRisk },
    ];
    const kpiBoxWidth = (contentWidth - 12) / 4;
    kpiData.forEach((kpi, i) => {
        const x = margin + i * (kpiBoxWidth + 4);
        const colors = [
            { bg: [59, 130, 246], text: [255, 255, 255] },
            { bg: [16, 185, 129], text: [255, 255, 255] },
            { bg: [99, 102, 241], text: [255, 255, 255] },
            { bg: [239, 68, 68], text: [255, 255, 255] },
        ];
        const c = colors[i];
        pdf.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
        pdf.roundedRect(x, y, kpiBoxWidth, 18, 2, 2, 'F');
        pdf.setFontSize(7);
        pdf.setTextColor(c.text[0], c.text[1], c.text[2]);
        pdf.text(kpi.label, x + 3, y + 6);
        pdf.setFontSize(12);
        pdf.setFont('Helvetica', 'bold');
        pdf.text(String(kpi.value), x + 3, y + 16);
        pdf.setFont('Helvetica', 'normal');
    });
    y += 28;

    // ── Student Table ──
    const headers = mode === 'group'
        ? [['No.', 'Control', 'Nombre del Alumno', 'Grupo', 'Clases', 'Asistencias', '%']]
        : [['No.', 'Materia', 'Profesor', 'Clases', 'Asistencias', '%']];

    const rows = d.map((item, idx) => {
        if (mode === 'group') {
            return [
                String(idx + 1),
                item['Número de Control'],
                item['Nombre del Alumno'] || '',
                item.Grupo || '',
                String(item['Total de Clases'] || 0),
                String(item.Asistencias || 0),
                `${(item.Porcentaje * 100).toFixed(0)}%`,
            ];
        }
        return [
            String(idx + 1),
            item.Materia || '',
            item.Profesor || '',
            String(item['Total de Clases'] || 0),
            String(item.Asistencias || 0),
            `${(item.Porcentaje * 100).toFixed(0)}%`,
        ];
    });

    const pctColIdx = mode === 'group' ? 6 : 5;

    (pdf as any).autoTable({
        head: headers,
        body: rows,
        startY: y,
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        styles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            lineColor: [210, 210, 210],
            lineWidth: 0.3,
            textColor: [50, 50, 50],
            font: 'helvetica',
        },
        headStyles: {
            fillColor: [30, 30, 30],
            textColor: [255, 255, 255],
            fontSize: 7.5,
            fontStyle: 'bold',
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            ...(mode === 'group'
                ? {
                    1: { halign: 'center', cellWidth: 24 },
                    2: { cellWidth: 58 },
                    3: { halign: 'center', cellWidth: 16 },
                    4: { halign: 'center', cellWidth: 14 },
                    5: { halign: 'center', cellWidth: 16 },
                    6: { halign: 'center', cellWidth: 12 },
                }
                : {
                    1: { cellWidth: 50 },
                    2: { cellWidth: 40 },
                    3: { halign: 'center', cellWidth: 16 },
                    4: { halign: 'center', cellWidth: 16 },
                    5: { halign: 'center', cellWidth: 12 },
                }),
        },
        alternateRowStyles: {
            fillColor: [248, 248, 248],
        },
        didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === pctColIdx) {
                const valStr = data.cell.text[0]?.replace('%', '');
                const val = parseFloat(valStr);
                if (!isNaN(val) && val < 80) {
                    data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [254, 242, 242];
                } else if (!isNaN(val) && val < 90) {
                    data.cell.styles.textColor = [202, 138, 4];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
        didDrawPage: (data: any) => {
            const pageCount = (pdf as any).internal.getNumberOfPages();
            pdf.setFontSize(7);
            pdf.setTextColor(160, 160, 160);
            pdf.text(
                `Generado por AulaEcosystem • ${new Date().toLocaleString('es-MX')}`,
                margin,
                pageHeight - 8
            );
            pdf.text(
                `Página ${data.pageNumber} de ${pageCount}`,
                pageWidth - margin,
                pageHeight - 8,
                { align: 'right' }
            );
        },
    });

    const filename = mode === 'group'
        ? `Reporte_Asistencia_${selectedGroups.join('_')}.pdf`
        : `Reporte_Asistencia_${selectedSearchStudent?.nombre || 'alumno'}.pdf`;
    pdf.save(filename);
}

// ── PDF Sábana ──

export async function exportSabanaPDF(
    data: ExtendedAttendanceRecord[],
    selectedGroups: string[],
    selectedSubject: string,
    selectedTeacher: string,
    selectedPeriod: string,
    parciales: ParcialConfig[],
    studentsDB: any[],
    dateCounts: Record<string, { date: Date; count: number }>
): Promise<void> {
    if (data.length === 0) return;

    const classDates = Object.keys(dateCounts).sort();
    const periodName = parciales.find(p => p.id === selectedPeriod)?.nombre || `Parcial ${selectedPeriod}`;
    const studentInfo = data[0] || {};
    const planEstudios = studentInfo.Especialidad || 'RADIOLOGÍA E IMAGEN';

    let groupTurn = 'VESPERTINO';
    if (selectedGroups.length > 0) {
        const baseGroup = selectedGroups[0].split(' - ')[0].trim();
        const matchingStudent = studentsDB.find(s => String(s.Grupo).trim() === baseGroup);
        if (matchingStudent && matchingStudent.Turno) {
            groupTurn = matchingStudent.Turno.toUpperCase();
        }
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    const STUDENTS_PER_PAGE = 18;
    const totalPages = Math.ceil(data.length / STUDENTS_PER_PAGE);
    const weekdays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const pageEl = document.createElement('div');
        pageEl.className = 'sabana-pdf-page';
        pageEl.style.width = '1123px';
        pageEl.style.height = '794px';
        pageEl.style.padding = '30px 40px';
        pageEl.style.boxSizing = 'border-box';
        pageEl.style.backgroundColor = '#ffffff';
        pageEl.style.color = '#000000';
        pageEl.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
        pageEl.style.display = 'flex';
        pageEl.style.flexDirection = 'column';
        pageEl.style.justifyContent = 'space-between';

        const startIndex = pageIdx * STUDENTS_PER_PAGE;
        const endIndex = Math.min(startIndex + STUDENTS_PER_PAGE, data.length);
        const pageStudents = data.slice(startIndex, endIndex);

        pageEl.innerHTML = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 80" width="350" height="60">
                        <g transform="translate(10, 5)">
                            <circle cx="30" cy="30" r="28" fill="none" stroke="#7a1c31" stroke-width="2"/>
                            <circle cx="30" cy="30" r="24" fill="none" stroke="#d4c19c" stroke-width="1.5"/>
                            <path d="M 30,12 C 22,20 20,32 30,48 C 40,32 38,20 30,12 Z" fill="#d4c19c"/>
                            <path d="M 24,25 Q 30,18 36,25 Q 30,35 24,25 Z" fill="#7a1c31"/>
                        </g>
                        <text x="85" y="38" font-family="'Lora', 'Times New Roman', serif" font-size="34" font-weight="bold" fill="#7a1c31" letter-spacing="1">SEP</text>
                        <text x="85" y="54" font-family="'Montserrat', 'Arial', sans-serif" font-size="8.5" font-weight="600" fill="#6f7276" letter-spacing="0.5">SECRETARÍA DE</text>
                        <text x="85" y="65" font-family="'Montserrat', 'Arial', sans-serif" font-size="8.5" font-weight="600" fill="#6f7276" letter-spacing="0.5">EDUCACIÓN PÚBLICA</text>
                    </svg>
                    <div style="text-align: right; font-size: 10px; color: #6f7276; font-weight: bold;">
                        <div style="font-size: 12px; color: #7a1c31;">CETIS No. 76</div>
                        <div>Control de Asistencias</div>
                    </div>
                </div>

                <div style="background-color: #545454; color: #ffffff; text-align: center; padding: 6px 0; font-size: 12px; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px; text-transform: uppercase;">
                    REPORTE DE ASISTENCIAS
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; font-size: 9px; margin-bottom: 12px; line-height: 1.4;">
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px;">
                        <span style="font-weight: bold; color: #333;">SUBSISTEMA:</span>
                        <span>DIRECCIÓN GENERAL DE EDUCACIÓN TECNOLÓGICA INDUSTRIAL Y DE SERVICIOS</span>

                        <span style="font-weight: bold; color: #333;">PLANTEL:</span>
                        <span>CENTRO DE ESTUDIOS TECNOLÓGICOS INDUSTRIAL Y DE SERVICIOS NO. 76</span>

                        <span style="font-weight: bold; color: #333;">PLAN DE ESTUDIOS:</span>
                        <span style="text-transform: uppercase;">${planEstudios}</span>

                        <span style="font-weight: bold; color: #333;">CLAVE DEL CENTRO DE TRABAJO:</span>
                        <span>09DET0076M</span>

                        <span style="font-weight: bold; color: #333;">ASIGNATURA O SUBMODULO:</span>
                        <span style="text-transform: uppercase; font-weight: bold; color: #7a1c31;">${selectedSubject}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-content: start;">
                        <span style="font-weight: bold; color: #333;">GRUPO:</span>
                        <span style="font-weight: bold;">${selectedGroups.join(', ')}</span>

                        <span style="font-weight: bold; color: #333;">DOCENTE:</span>
                        <span style="text-transform: uppercase;">${selectedTeacher}</span>

                        <span style="font-weight: bold; color: #333;">TURNO:</span>
                        <span>${groupTurn}</span>

                        <span style="font-weight: bold; color: #333;">PERIODO:</span>
                        <span>${periodName.toUpperCase()}</span>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 9px; color: #000000; border: 1.5px solid #000000;">
                    <thead>
                        <tr style="background-color: #f3f4f6; font-weight: bold; text-align: center;">
                            <th style="border: 1px solid #000000; padding: 4px; width: 30px;" rowspan="2">NUM</th>
                            <th style="border: 1px solid #000000; padding: 4px; width: 90px;" rowspan="2">NO. CONTROL</th>
                            <th style="border: 1px solid #000000; padding: 4px; text-align: left;" rowspan="2">NOMBRE DEL ALUMNO</th>
                            <th style="border: 1px solid #000000; padding: 2px;" colspan="${classDates.length}">ASISTENCIAS</th>
                            <th style="border: 1px solid #000000; padding: 4px; width: 30px;" rowspan="2">T.A</th>
                            <th style="border: 1px solid #000000; padding: 4px; width: 30px;" rowspan="2">T.F</th>
                        </tr>
                        <tr style="background-color: #f3f4f6; font-weight: bold; text-align: center; font-size: 8px;">
                            ${classDates.map(dateKey => {
                                const dt = new Date(dateKey + 'T00:00:00');
                                const dayNum = dt.getDate();
                                const dayOfWeek = weekdays[dt.getDay()];
                                return `
                                    <th style="border: 1px solid #000000; padding: 2px; width: 22px; line-height: 1.1;">
                                        <div style="font-size: 7px; color: #666;">${dayNum}</div>
                                        <div style="font-weight: bold;">${dayOfWeek}</div>
                                    </th>
                                `;
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${pageStudents.map((student, idx) => {
                            const num = startIndex + idx + 1;
                            const control = student['Número de Control'] || '';
                            const name = student['Nombre del Alumno'] || '';

                            const studentDates = new Set<string>();
                            const justifiedDates = new Set<string>();
                            const historicoJustificado = new Set<string>();

                            try {
                                const fechas = JSON.parse(student['Fechas y Horas de Asistencia'] || '[]');
                                fechas.forEach((fReq: any) => {
                                    const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                                    const status = typeof fReq === 'object' ? fReq.status : 'Asistencia';
                                    const notes = typeof fReq === 'object' ? fReq.notes : '';
                                    const dateObj = new Date(fStr);
                                    if (!isNaN(dateObj.getTime())) {
                                        const dateKey = dateObj.toISOString().split('T')[0];
                                        studentDates.add(dateKey);
                                        if (status === 'Justificado') {
                                            justifiedDates.add(dateKey);
                                        }
                                        if (status === 'Justificado' && typeof notes === 'string') {
                                            const match = notes.match(/histórico \((.+?)\)/i);
                                            if (match && match[1]) {
                                                historicoJustificado.add(match[1]);
                                            }
                                        }
                                    }
                                });
                            } catch (e) {}

                            let ta = 0;
                            let tf = 0;

                            const colsHtml = classDates.map(dateKey => {
                                let mark = '';
                                let cellStyle = '';

                                if (studentDates.has(dateKey) && !justifiedDates.has(dateKey)) {
                                    mark = '/';
                                    ta++;
                                } else if (justifiedDates.has(dateKey) || historicoJustificado.has(dateKey)) {
                                    mark = 'J';
                                    cellStyle = 'color: #0ea5e9; font-weight: bold; background-color: #f0f9ff;';
                                } else {
                                    mark = 'F';
                                    tf++;
                                    cellStyle = 'color: #ef4444; font-weight: bold; background-color: #fef2f2;';
                                }

                                return `<td style="border: 1px solid #000000; text-align: center; padding: 2px; ${cellStyle}">${mark}</td>`;
                            }).join('');

                            return `
                                <tr>
                                    <td style="border: 1px solid #000000; text-align: center; padding: 4px;">${num}</td>
                                    <td style="border: 1px solid #000000; text-align: center; padding: 4px; font-family: monospace;">${control}</td>
                                    <td style="border: 1px solid #000000; padding: 4px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${name}</td>
                                    ${colsHtml}
                                    <td style="border: 1px solid #000000; text-align: center; padding: 4px; font-weight: bold; background-color: #f3f4f6;">${ta}</td>
                                    <td style="border: 1px solid #000000; text-align: center; padding: 4px; font-weight: bold; background-color: #fef2f2; color: #ef4444;">${tf}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #6f7276; border-top: 1px solid #e5e7eb; padding-top: 6px; margin-top: 10px;">
                <div>Generado por Sistema AulaEcosystem • ${new Date().toLocaleString('es-MX')}</div>
                <div style="font-weight: bold;">Página ${pageIdx + 1} de ${totalPages}</div>
            </div>
        `;

        container.appendChild(pageEl);
    }

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageElements = container.querySelectorAll('.sabana-pdf-page');
    for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) {
            pdf.addPage();
        }
        const canvas = await html2canvas(pageElements[i] as HTMLElement, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
    }

    pdf.save(`Sabana_Asistencias_${selectedGroups.join('_')}_${selectedSubject.substring(0, 15)}.pdf`);
    document.body.removeChild(container);
}

// ── PDF Detalle Alumno ──

export async function exportStudentDetailPDF(
    student: ExtendedAttendanceRecord,
    studentsDB: any[],
    selectedGroups: string[],
    selectedSubject: string,
    selectedTeacher: string,
    selectedPeriod: string,
    parciales: ParcialConfig[]
): Promise<void> {
    const control = student['Número de Control'] || '';
    const name = student['Nombre del Alumno'] || '';
    const group = student.Grupo || selectedGroups.join(', ');
    const subject = student.Materia || selectedSubject || '';
    const teacher = student.Profesor || selectedTeacher || '';
    const plan = student.Especialidad || 'RADIOLOGÍA E IMAGEN';
    const periodName = parciales.find(p => p.id === selectedPeriod)?.nombre || `Parcial ${selectedPeriod}`;

    let groupTurn = 'VESPERTINO';
    if (group) {
        const baseGroup = group.split(' - ')[0].trim();
        const matchingStudent = studentsDB.find(s => String(s.Grupo).trim() === baseGroup);
        if (matchingStudent?.Turno) groupTurn = matchingStudent.Turno.toUpperCase();
    }

    const rawDates: { dateStr: string; timeStr: string; status: string; notes: string }[] = [];
    try {
        const parsed = JSON.parse(student['Fechas y Horas de Asistencia'] || '[]');
        if (Array.isArray(parsed)) {
            parsed.forEach((d: any) => {
                const dateStr = typeof d === 'string' ? d : d.date;
                const status = typeof d === 'object' ? d.status : 'Asistencia';
                const notes = typeof d === 'object' ? d.notes : '';
                const dt = new Date(dateStr);
                if (!isNaN(dt.getTime())) {
                    rawDates.push({
                        dateStr: dt.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
                        timeStr: dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                        status,
                        notes
                    });
                }
            });
        }
    } catch (e) {}

    const faltas = (student.faltasCalculadas || []).map((f: string) => {
        const parts = f.split('-');
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dt.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    });

    const totalAsistencias = student.Asistencias || 0;
    const totalClases = student['Total de Clases'] || 0;
    const porcentaje = ((student.Porcentaje || 0) * 100).toFixed(0);

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    const pageEl = document.createElement('div');
    pageEl.style.width = '794px';
    pageEl.style.height = '1123px';
    pageEl.style.padding = '40px';
    pageEl.style.boxSizing = 'border-box';
    pageEl.style.backgroundColor = '#ffffff';
    pageEl.style.color = '#000000';
    pageEl.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
    pageEl.style.display = 'flex';
    pageEl.style.flexDirection = 'column';

    const faltasHtml = faltas.length > 0
        ? faltas.map(f => `<div style="color: #ef4444; padding: 4px 0; border-bottom: 1px solid #fee2e2; font-size: 11px;">✗ ${f}</div>`).join('')
        : '<div style="color: #6b7280; font-size: 11px;">Sin faltas registradas.</div>';

    const recordsHtml = rawDates.length > 0
        ? rawDates.map(r => {
            const isJust = r.status === 'Justificado';
            const color = isJust ? '#0ea5e9' : '#16a34a';
            const icon = isJust ? 'ⓘ' : '✓';
            const bg = isJust ? '#f0f9ff' : '#f0fdf4';
            const border = isJust ? '#bae6fd' : '#bbf7d0';
            let extra = '';
            if (isJust && r.notes) {
                const match = r.notes.match(/histórico \((.+?)\)/i);
                if (match && match[1]) {
                    const parts = match[1].split('-');
                    const histDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    extra = ` — Cubre falta del ${histDate.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`;
                }
            }
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 4px; border-radius: 6px; background-color: ${bg}; border: 1px solid ${border};">
                    <div>
                        <span style="font-weight: 600; font-size: 12px; color: #1f2937;">${r.dateStr}</span>
                        <span style="font-size: 11px; color: #6b7280; margin-left: 8px;">${r.timeStr}</span>
                        ${extra ? `<span style="font-size: 10px; color: ${color}; display: block; margin-top: 2px;">${extra}</span>` : ''}
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: ${color};">${icon} ${isJust ? 'JUSTIFICADA' : 'ASISTENCIA'}</span>
                </div>
            `;
        }).join('')
        : '<div style="color: #6b7280; font-size: 11px;">Sin registros de asistencia.</div>';

    pageEl.innerHTML = `
        <div style="flex-shrink: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 2px solid #7a1c31; padding-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 80" width="280" height="48">
                        <g transform="translate(10, 5)">
                            <circle cx="30" cy="30" r="28" fill="none" stroke="#7a1c31" stroke-width="2"/>
                            <circle cx="30" cy="30" r="24" fill="none" stroke="#d4c19c" stroke-width="1.5"/>
                            <path d="M 30,12 C 22,20 20,32 30,48 C 40,32 38,20 30,12 Z" fill="#d4c19c"/>
                            <path d="M 24,25 Q 30,18 36,25 Q 30,35 24,25 Z" fill="#7a1c31"/>
                        </g>
                        <text x="85" y="38" font-family="'Lora', 'Times New Roman', serif" font-size="34" font-weight="bold" fill="#7a1c31" letter-spacing="1">SEP</text>
                        <text x="85" y="54" font-family="'Montserrat', 'Arial', sans-serif" font-size="8.5" font-weight="600" fill="#6f7276" letter-spacing="0.5">SECRETARÍA DE</text>
                        <text x="85" y="65" font-family="'Montserrat', 'Arial', sans-serif" font-size="8.5" font-weight="600" fill="#6f7276" letter-spacing="0.5">EDUCACIÓN PÚBLICA</text>
                    </svg>
                    <div style="border-left: 1px solid #d1d5db; height: 40px;"></div>
                    <div style="text-align: left;">
                        <div style="font-size: 13px; font-weight: 700; color: #7a1c31;">CETIS No. 76</div>
                        <div style="font-size: 10px; color: #6f7276;">Control de Asistencias</div>
                    </div>
                </div>
                <div style="font-size: 9px; color: #6f7276;">${new Date().toLocaleDateString('es-MX')}</div>
            </div>

            <div style="background-color: #7a1c31; color: #ffffff; text-align: center; padding: 8px 0; font-size: 13px; font-weight: 700; letter-spacing: 1px; margin-bottom: 16px; text-transform: uppercase; border-radius: 4px;">
                Detalle de Asistencias — ${name}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 10px; margin-bottom: 16px; line-height: 1.5;">
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 10px;">
                    <span style="font-weight: 700; color: #374151;">ALUMNO:</span>
                    <span style="text-transform: uppercase; font-weight: 600;">${name}</span>

                    <span style="font-weight: 700; color: #374151;">NO. CONTROL:</span>
                    <span style="font-family: monospace;">${control}</span>

                    <span style="font-weight: 700; color: #374151;">GRUPO:</span>
                    <span>${group}</span>

                    <span style="font-weight: 700; color: #374151;">PLAN DE ESTUDIOS:</span>
                    <span style="text-transform: uppercase;">${plan}</span>
                </div>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 10px;">
                    <span style="font-weight: 700; color: #374151;">ASIGNATURA:</span>
                    <span style="text-transform: uppercase; font-weight: 600; color: #7a1c31;">${subject}</span>

                    <span style="font-weight: 700; color: #374151;">DOCENTE:</span>
                    <span style="text-transform: uppercase;">${teacher}</span>

                    <span style="font-weight: 700; color: #374151;">TURNO:</span>
                    <span>${groupTurn}</span>

                    <span style="font-weight: 700; color: #374151;">PERIODO:</span>
                    <span>${periodName.toUpperCase()}</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Asistencias</div>
                    <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${totalAsistencias}</div>
                    <div style="font-size: 10px; color: #6b7280;">de ${totalClases} clases</div>
                </div>
                <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Promedio</div>
                    <div style="font-size: 24px; font-weight: 700; color: ${Number(porcentaje) < 80 ? '#ef4444' : '#16a34a'};">${porcentaje}%</div>
                </div>
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Faltas</div>
                    <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${faltas.length}</div>
                </div>
            </div>

            <div style="font-size: 13px; font-weight: 700; color: #1f2937; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">Registro Cronológico</div>
            <div style="margin-bottom: 16px;">
                ${recordsHtml}
            </div>

            ${faltas.length > 0 ? `
                <div style="font-size: 13px; font-weight: 700; color: #ef4444; margin-bottom: 10px; border-bottom: 2px solid #fecaca; padding-bottom: 6px;">Faltas Detectadas (${faltas.length})</div>
                <div>${faltasHtml}</div>
            ` : ''}
        </div>

        <div style="margin-top: auto; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #9ca3af;">
            <div>Generado por Sistema AulaEcosystem</div>
            <div>${new Date().toLocaleString('es-MX')}</div>
        </div>
    `;

    container.appendChild(pageEl);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const canvas = await html2canvas(pageEl, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    pdf.save(`Detalle_${name.substring(0, 20)}.pdf`);

    document.body.removeChild(container);
}
