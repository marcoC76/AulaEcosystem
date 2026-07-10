import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import * as botttsNeutral from '@dicebear/bottts-neutral';
import { cn } from '../../lib/utils';

interface StudentAvatarProps {
    name: string;
    control?: string | number;
    size?: number;
    className?: string;
}

export default function StudentAvatar({ name, control, size = 48, className }: StudentAvatarProps) {
    const dataUri = useMemo(() => {
        const seed = `${name || ''}-${String(control || '')}`;
        return createAvatar(botttsNeutral, { seed, size }).toDataUri();
    }, [name, control, size]);

    return (
        <img
            src={dataUri}
            width={size}
            height={size}
            className={cn('rounded-xl shadow-sm', className)}
            style={{ minWidth: size }}
            alt=""
            aria-hidden="true"
        />
    );
}
