import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('nuclear', 'it')

export default function NuclearLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
