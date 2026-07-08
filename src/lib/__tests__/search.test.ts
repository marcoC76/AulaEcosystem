import { describe, it, expect } from 'vitest';
import { getStudentName, searchStudents } from '../search';
import type { StudentDBRecord } from '../../types';

const mockDB: StudentDBRecord[] = [
  {
    'No. Control': '221910001',
    'Nombre(s)': 'JUAN',
    'Apellido Paterno': 'PEREZ',
    'Apellido Materno': 'LOPEZ',
    'Grupo': '4A',
    'Carrera': 'PROGRAMACION',
  },
  {
    'No. Control': '221910002',
    'Nombre(s)': 'MARIA',
    'Apellido Paterno': 'GARCIA',
    'Apellido Materno': 'HERNANDEZ',
    'Grupo': '4B',
    'Carrera': 'CONTABILIDAD',
  },
  {
    'No. Control': '221910003',
    'Nombre(s)': 'PEDRO',
    'Apellido Paterno': 'JUAREZ',
    'Apellido Materno': 'MARTINEZ',
    'Grupo': '4A',
    'Carrera': 'PROGRAMACION',
  },
];

describe('getStudentName', () => {
  it('returns full name from a student record', () => {
    const name = getStudentName(mockDB[0] as any);
    expect(name).toBe('JUAN PEREZ LOPEZ');
  });
});

describe('searchStudents', () => {
  it('returns empty array for short queries', () => {
    expect(searchStudents(mockDB, 'J', 5)).toEqual([]);
  });

  it('finds students by name', () => {
    const results = searchStudents(mockDB, 'JUAN PEREZ', 5);
    expect(results.some(r => r.nombre === 'JUAN PEREZ LOPEZ')).toBe(true);
  });

  it('finds students by control number', () => {
    const results = searchStudents(mockDB, '221910002', 5);
    expect(results.some(r => r.control === '221910002')).toBe(true);
  });

  it('returns empty array when no match', () => {
    const results = searchStudents(mockDB, 'ZZZZZ', 5);
    expect(results).toEqual([]);
  });

  it('respects limit parameter', () => {
    const results = searchStudents(mockDB, '4', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
