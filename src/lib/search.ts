import Fuse from 'fuse.js'
import type { StudentDBRecord } from '../types'

export interface StudentSearchResult {
    nombre: string
    control: string
}

export function getStudentName(student: StudentDBRecord): string {
    return `${student['Nombre(s)']} ${student['Apellido Paterno']} ${student['Apellido Materno']}`.trim()
}

export function getStudentControl(student: StudentDBRecord): string {
    return String(student['No. Control'] ?? '').trim()
}

export function getStudentGrupo(student: StudentDBRecord): string {
    return String(student['Grupo'] ?? '').trim()
}

export function getStudentEspecialidad(student: StudentDBRecord): string {
    return String(student['Carrera'] ?? '').trim()
}

export function findStudentByControl(db: StudentDBRecord[], control: string): StudentDBRecord | undefined {
    const term = control.trim().toLowerCase()
    return db.find(s => {
        const sId = getStudentControl(s)
        return sId.toLowerCase() === term
    })
}

export function searchStudents(
    studentsDB: StudentDBRecord[],
    query: string,
    limit: number = 5
): StudentSearchResult[] {
    if (query.length < 2) return []

    const cleanStudents = studentsDB.map(student => ({
        nombre: getStudentName(student),
        control: getStudentControl(student)
    }))

    const fuse = new Fuse(cleanStudents, {
        keys: ['nombre', 'control'],
        threshold: 0.4,
        ignoreLocation: true
    })

    return fuse.search(query).slice(0, limit).map(r => r.item)
}

export function getUniqueGroups(
    studentsDB: StudentDBRecord[]
): string[] {
    return Array.from(new Set(studentsDB.map(s => {
        const specialty = getStudentEspecialidad(s)
        const grupo = getStudentGrupo(s)
        return specialty ? `${grupo} - ${specialty}` : grupo
    }))).filter(Boolean).sort()
}
