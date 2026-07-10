import { useMemo } from 'react';
import { cn } from '../../lib/utils';

function hashStr(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

type CellType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

function generatePixels(seed: number): { grid: CellType[][]; hat: boolean; blush: boolean; glasses: boolean } {
    const hairStyle = seed % 5;
    const eyeStyle = (seed >> 3) % 3;
    const mouthStyle = (seed >> 5) % 3;
    const hat = ((seed >> 7) & 1) === 0;
    const blush = ((seed >> 8) & 1) === 1;
    const glasses = ((seed >> 9) & 1) === 0 && !hat;

    const grid: CellType[][] = Array.from({ length: 8 }, () => Array(8).fill(0));

    // ── Hair (value=1) ──
    if (hat) {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) grid[r][c] = 5;
        grid[0][0] = 0; grid[0][7] = 0;
    } else if (hairStyle === 0) {
        for (let c = 0; c < 8; c++) { grid[0][c] = 1; grid[1][c] = 1; }
        grid[2][0] = 1; grid[2][1] = 1; grid[2][6] = 1; grid[2][7] = 1;
    } else if (hairStyle === 1) {
        for (let r = 0; r < 3; r++) for (let c = 2; c <= 5; c++) grid[r][c] = 1;
    } else if (hairStyle === 2) {
        for (let c = 0; c < 8; c++) { grid[0][c] = 1; grid[1][c] = 1; }
        grid[2][0] = 1; grid[2][1] = 1; grid[2][6] = 1; grid[2][7] = 1;
        grid[3][0] = 1; grid[3][7] = 1;
        grid[4][0] = 1; grid[4][7] = 1;
    } else if (hairStyle === 3) {
        for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) grid[r][c] = 1;
        for (let c = 0; c < 8; c++) grid[2][c] = 1;
        grid[0][2] = 0; grid[0][5] = 0;
    } else {
        for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) grid[r][c] = 1;
        grid[2][0] = 1; grid[2][1] = 1; grid[2][2] = 1; grid[2][5] = 1; grid[2][6] = 1; grid[2][7] = 1;
    }

    // ── Eyes (value=2), Glasses (value=6) ──
    if (glasses) {
        grid[3][1] = 6; grid[3][2] = 6; grid[3][3] = 6;
        grid[3][4] = 6; grid[3][5] = 6; grid[3][6] = 6;
        grid[4][2] = 2; grid[4][5] = 2;
    } else if (eyeStyle === 0) {
        grid[3][2] = 2; grid[3][5] = 2;
    } else if (eyeStyle === 1) {
        grid[3][2] = 2; grid[3][3] = 2; grid[3][4] = 2; grid[3][5] = 2;
    } else {
        grid[4][2] = 2; grid[4][5] = 2;
    }

    // ── Blush (value=7) ──
    if (blush) {
        grid[4][1] = 7; grid[4][6] = 7;
    }

    // ── Mouth (value=3) ──
    if (mouthStyle === 0) {
        grid[5][3] = 3; grid[5][4] = 3; grid[6][2] = 3; grid[6][5] = 3;
    } else if (mouthStyle === 1) {
        grid[5][3] = 3; grid[5][4] = 3;
    } else {
        grid[5][3] = 3;
    }

    // ── Shirt (value=4) ──
    grid[6][2] = 4; grid[6][3] = 4; grid[6][4] = 4; grid[6][5] = 4;
    for (let c = 0; c < 8; c++) grid[7][c] = 4;

    return { grid, hat, blush, glasses };
}

const PIXEL = 12;
const VIEW = PIXEL * 8;
const GAP = 0.5;
const BORDER_RADIUS = 14;

interface StudentAvatarProps {
    name: string;
    control?: string | number;
    size?: number;
    className?: string;
}

export default function StudentAvatar({ name, control, size = 48, className }: StudentAvatarProps) {
    const { skinColor, hairColor, shirtColor, eyeColor, mouthColor, bgColor, grid, hat } = useMemo(() => {
        const seed = hashStr((name || '') + String(control || ''));
        const { grid, hat } = generatePixels(seed);

        const skinColors = ['#FDE3C8', '#E8C39E', '#D4A574', '#C68642', '#8D5524', '#A0714F', '#C68642', '#E8C39E'];
        const hairColors = ['#1C1C1C', '#3B2F2F', '#5C4033', '#B5651D', '#D4A017', '#F5D06C', '#8B4513', '#4A4A4A', '#2B1B17', '#6B3A2A', '#1A1A2E', '#16213E'];
        const shirtColors = ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22', '#FF6B6B', '#00CEC9', '#6C5CE7', '#FD79A8', '#0984E3'];
        const eyeColors = ['#1C1C1C', '#3B2F2F', '#4A3728', '#2C1810', '#1C1C1C', '#3B3028'];
        const mouthColors = ['#E74C3C', '#C0392B', '#FF6B6B', '#E8A0A8', '#E74C3C', '#D63031'];
        const bgColors = ['#FFEAA7', '#DFE6E9', '#B8E994', '#F8C291', '#A29BFE', '#FD79A8', '#74B9FF', '#55EFC4', '#FFEAA7', '#81ECEC', '#FAB1A0', '#DDA0DD'];

        return {
            skinColor: skinColors[seed % skinColors.length],
            hairColor: hairColors[(seed >> 2) % hairColors.length],
            shirtColor: shirtColors[(seed >> 4) % shirtColors.length],
            eyeColor: eyeColors[(seed >> 6) % eyeColors.length],
            mouthColor: mouthColors[(seed >> 8) % mouthColors.length],
            bgColor: bgColors[(seed >> 10) % bgColors.length],
            grid,
            hat,
        };
    }, [name, control]);

    const colorMap: Record<number, string> = {
        0: skinColor,
        1: hairColor,
        2: eyeColor,
        3: mouthColor,
        4: shirtColor,
        5: hat ? '#C0392B' : hairColor,
        6: '#F1C40F',
        7: '#FF6B6B',
    };

    return (
        <svg
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            width={size}
            height={size}
            className={cn('rounded-xl shadow-sm', className)}
            style={{ minWidth: size }}
            aria-hidden="true"
        >
            <rect width={VIEW} height={VIEW} rx={BORDER_RADIUS} fill={bgColor} />
            {grid.map((row, r) =>
                row.map((cell, c) => (
                    <rect
                        key={`${r}-${c}`}
                        x={c * PIXEL + GAP}
                        y={r * PIXEL + GAP}
                        width={PIXEL - GAP * 2}
                        height={PIXEL - GAP * 2}
                        rx={1.5}
                        fill={colorMap[cell]}
                    />
                ))
            )}
        </svg>
    );
}
