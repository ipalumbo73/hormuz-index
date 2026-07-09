import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('timeline', 'it')

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
