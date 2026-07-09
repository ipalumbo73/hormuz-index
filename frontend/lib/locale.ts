import type { Lang } from '@/lib/seo'

/**
 * Resolves the locale of a client-side route.
 *
 * English is the default and lives at the root, so anything not under /it is English.
 * Deriving this from a single place keeps client components from breaking the next
 * time the URL layout changes.
 */
export function localeFromPathname(pathname: string): Lang {
  return pathname === '/it' || pathname.startsWith('/it/') ? 'it' : 'en'
}
