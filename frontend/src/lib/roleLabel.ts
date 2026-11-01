/**
 * What people see for a stored role. The database keeps `Teacher` (SQL reports and old
 * accounts depend on it); everywhere on screen it reads "Educator".
 */
export function roleLabel(designation: string | null | undefined): string {
    return designation === 'Teacher' ? 'Educator' : designation || '';
}
