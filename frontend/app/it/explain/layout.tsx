import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('explain', 'it')

export default function ExplainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
