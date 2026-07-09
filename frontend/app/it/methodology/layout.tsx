import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('methodology', 'it')

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
