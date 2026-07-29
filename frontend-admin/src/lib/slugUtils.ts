
export function toSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
}

export function fromSlug(slug: string): string {
    return slug
        .replace(/-/g, ' ');
}
