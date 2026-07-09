import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('briefing', 'it')

export default function BriefingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
