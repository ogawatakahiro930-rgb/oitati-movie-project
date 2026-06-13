'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Film, Clock, CheckCircle, AlertCircle } from 'lucide-react'

type Project = {
  id: string
  title: string
  status: string
  createdAt: string
  personName: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: '入力中', color: 'text-gray-400', icon: <Clock className="w-4 h-4" /> },
  ready: { label: '生成待ち', color: 'text-blue-400', icon: <Clock className="w-4 h-4" /> },
  generating: { label: 'AI生成中', color: 'text-amber-400', icon: <Clock className="w-4 h-4 animate-spin" /> },
  review: { label: '確認中', color: 'text-purple-400', icon: <AlertCircle className="w-4 h-4" /> },
  completed: { label: '完成', color: 'text-green-400', icon: <CheckCircle className="w-4 h-4" /> },
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <p className="text-gray-400 mt-1 text-sm">顧客の生い立ちムービーを制作する</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規プロジェクト
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">読み込み中...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">まだプロジェクトがありません</p>
          <p className="text-gray-500 text-sm mt-1">「新規プロジェクト」から始めてください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const s = statusConfig[p.status] ?? statusConfig.draft
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="border border-gray-800 rounded-xl p-5 hover:border-gray-600 hover:bg-gray-900 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-black font-bold text-sm">
                    {p.personName[0]}
                  </div>
                  <span className={`flex items-center gap-1 text-xs ${s.color}`}>
                    {s.icon}
                    {s.label}
                  </span>
                </div>
                <h2 className="font-semibold group-hover:text-amber-400 transition-colors">
                  {p.title}
                </h2>
                <p className="text-gray-400 text-sm mt-1">{p.personName}さん</p>
                <p className="text-gray-600 text-xs mt-3">
                  {new Date(p.createdAt).toLocaleDateString('ja-JP')}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
