import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '生い立ちムービー生成システム',
  description: '人生の連続性を映像化する',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <header className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600" />
            <span className="font-semibold text-lg tracking-tight">生い立ちムービー</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
