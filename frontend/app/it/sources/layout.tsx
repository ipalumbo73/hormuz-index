import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('sources', 'it')

export default function SourcesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
