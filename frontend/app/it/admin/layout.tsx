import { noindexMetadata } from '@/lib/seo'

export const metadata = noindexMetadata

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
