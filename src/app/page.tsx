'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, Film, Clock, CheckCircle, AlertCircle, Download, Upload, Loader2 } from 'lucide-react'

type Project = {
  id: string
  title: string
  status: string
  createdAt: string
  personName: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:      { label: '入力中',   color: 'text-gray-500',   bg: 'bg-gray-100',   icon: <Clock className="w-3 h-3" /> },
  ready:      { label: '生成待ち', color: 'text-blue-600',   bg: 'bg-blue-50',    icon: <Clock className="w-3 h-3" /> },
  generating: { label: 'AI生成中', color: 'text-amber-600',  bg: 'bg-amber-50',   icon: <Clock className="w-3 h-3 animate-spin" /> },
  review:     { label: '確認中',   color: 'text-purple-600', bg: 'bg-purple-50',  icon: <AlertCircle className="w-3 h-3" /> },
  completed:  { label: '完成',     color: 'text-green-600',  bg: 'bg-green-50',   icon: <CheckCircle className="w-3 h-3" /> },
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [restoreError, setRestoreError] = useState('')
  const restoreInputRef = useRef<HTMLInputElement>(null)

  const loadProjects = () => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadProjects() }, [])

  const handleRestore = async (file: File) => {
    if (!confirm('すべてのデータが復元ファイルの内容で上書きされます。\n現在のデータは消去されます。続けますか？')) return
    setRestoring(true)
    setRestoreStatus('idle')
    setRestoreError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/backup', { method: 'POST', body: fd })
      if (res.ok) {
        setRestoreStatus('success')
        setLoading(true)
        loadProjects()
      } else {
        const d = await res.json()
        setRestoreStatus('error')
        setRestoreError(d.error ?? '復元に失敗しました')
      }
    } catch {
      setRestoreStatus('error')
      setRestoreError('ネットワークエラーが発生しました')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
          <p className="text-gray-500 mt-1 text-sm">顧客の生い立ちムービーを制作する</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規プロジェクト
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-amber-100">
          <Film className="w-12 h-12 text-amber-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">まだプロジェクトがありません</p>
          <p className="text-gray-400 text-sm mt-1">「新規プロジェクト」から始めてください</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 mt-5 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> 最初のプロジェクトを作成
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const s = statusConfig[p.status] ?? statusConfig.draft
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="bg-white border border-amber-100 rounded-2xl p-5 hover:shadow-md hover:border-amber-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {p.personName[0]}
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${s.color} ${s.bg}`}>
                    {s.icon}
                    {s.label}
                  </span>
                </div>
                <h2 className="font-bold text-gray-800 group-hover:text-amber-600 transition-colors leading-snug">
                  {p.title}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{p.personName}さん</p>
                <p className="text-gray-300 text-xs mt-4">
                  {new Date(p.createdAt).toLocaleDateString('ja-JP')}
                </p>
              </Link>
            )
          })}
        </div>
      )}

      {/* バックアップ・復元 */}
      <div className="mt-10 pt-6 border-t border-amber-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">データ管理</span>
          <div className="flex items-center gap-2">
            <a
              href="/api/backup"
              download
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm px-3 py-1.5 rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              バックアップ
            </a>
            <button
              onClick={() => { setRestoreStatus('idle'); restoreInputRef.current?.click() }}
              disabled={restoring}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            >
              {restoring
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />復元中...</>
                : <><Upload className="w-3.5 h-3.5" />復元</>
              }
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { handleRestore(f); e.target.value = '' }
              }}
            />
          </div>
        </div>
        {restoreStatus === 'success' && (
          <p className="text-xs text-green-600 mt-2 text-right">復元が完了しました。</p>
        )}
        {restoreStatus === 'error' && (
          <p className="text-xs text-red-500 mt-2 text-right">{restoreError}</p>
        )}
      </div>
    </div>
  )
}
