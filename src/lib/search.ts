import Fuse from 'fuse.js'
import type { StudentDBRecord } from '../types'

interface StudentSearchResult {
    nombre: string
    control: string
}

const studentKeys = {
    nombre: (s: Record<string, any>) => {
        const nameKey = Object.keys(s).find(k => k.toLowerCase().includes('nombre')) || 'Nombre(s)'
        const patKey = Object.keys(s).find(k => k.toLowerCase().includes('paterno')) || 'Apellido Paterno'
        const matKey = Object.keys(s).find(k => k.toLowerCase().includes('materno')) || 'Apellido Materno'
        return `${s[nameKey]} ${s[patKey]} ${s[matKey]}`.trim()
    },
    control: (s: Record<string, any>) => {
        const controlKey = Object.keys(s).find(k => k.toLowerCase().includes('control'))
        return controlKey ? String(s[controlKey]) : ''
    },
    grupo: (s: Record<string, any>) => {
        const groupKey = Object.keys(s).find(k => k.toLowerCase().includes('grupo')) || 'Grupo'
        return String(s[groupKey] || '').trim()
    },
    especialidad: (s: Record<string, any>) => {
        const careerKey = Object.keys(s).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad')) || 'Carrera'
        return String(s[careerKey] || '').trim()
    }
}

export function getStudentName(student: Record<string, any>): string {
    return studentKeys.nombre(student)
}

export function getStudentControl(student: Record<string, any>): string {
    return studentKeys.control(student)
}

export function getStudentGrupo(student: Record<string, any>): string {
    return studentKeys.grupo(student)
}

export function getStudentEspecialidad(student: Record<string, any>): string {
    return studentKeys.especialidad(student)
}

export function findStudentByControl(db: StudentDBRecord[], control: string): StudentDBRecord | undefined {
    const term = control.trim().toLowerCase()
    return db.find(s => {
        const sId = getStudentControl(s as any)
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
        nombre: getStudentName(student as any),
        control: getStudentControl(student as any)
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
        const specialty = getStudentEspecialidad(s as any)
        const grupo = getStudentGrupo(s as any)
        return specialty ? `${grupo} - ${specialty}` : grupo
    }))).filter(Boolean).sort()
}
