'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { Sparkles, BookOpen, Film, FileText, ChevronDown, ChevronUp, Copy, Check, Video, Play, Loader2, AlertCircle } from 'lucide-react'

type Project = {
  id: string; title: string; status: string; operatorNotes: string | null
  personId: string; videoStyleId: string | null; createdAt: string
}
type Scene = {
  id: string; orderIndex: number; title: string; ageAtScene: number | null
  yearAtScene: number | null; location: string | null; eventSummary: string
  emotionKeywords: string[] | null; emotionalStage: string | null
}
type CharacterBible = {
  id: string; faceCoreFeatures: string; consistencyAnchor: string
  overallAtmosphere: string | null
  ageProgression: Record<string, { hair: string; face: string; style: string }>
  lifeStageStates: Record<string, { posture: string; gait: string; eyeExpression: string; mentalState: string }>
  reviewed: boolean
}
type Prompt = {
  id: string; sceneId: string | null; promptType: string
  promptContent: string; negativePrompt: string | null; targetModel: string | null
}
type Narration = {
  id: string; sceneId: string | null; textContent: string; emotionTone: string | null
}
type VideoRecord = {
  id: string; sceneId: string | null; klingTaskId: string | null
  klingPrompt: string | null; videoUrl: string | null
  status: string; errorMessage: string | null; aspectRatio: string | null
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [characterBible, setCharacterBible] = useState<CharacterBible | null>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [narrations, setNarrations] = useState<Narration[]>([])
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [generating, setGenerating] = useState(false)
  const [generatingVideoFor, setGeneratingVideoFor] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'character' | 'prompts' | 'narration' | 'videos'>('overview')
  const [expandedScene, setExpandedScene] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const loadVideos = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}/videos`)
    if (res.ok) setVideos(await res.json())
  }, [id])

  const load = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/scenes`),
    ])
    const p = await pRes.json()
    const s = await sRes.json()
    setProject(p)
    setScenes(s)

    if (p.status !== 'draft' && p.status !== 'ready') {
      const [cbRes, prRes, nrRes] = await Promise.all([
        fetch(`/api/projects/${id}/character-bible`),
        fetch(`/api/projects/${id}/prompts`),
        fetch(`/api/projects/${id}/narrations`),
      ])
      if (cbRes.ok) setCharacterBible(await cbRes.json())
      if (prRes.ok) setPrompts(await prRes.json())
      if (nrRes.ok) setNarrations(await nrRes.json())
      await loadVideos()
    }
  }, [id, loadVideos])

  useEffect(() => { load() }, [load])

  // 処理中の動画をポーリング
  useEffect(() => {
    const processing = videos.filter(v => v.status === 'processing' && v.klingTaskId)
    if (processing.length === 0) return

    const interval = setInterval(async () => {
      for (const v of processing) {
        const res = await fetch(`/api/videos/${v.klingTaskId}/status`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'completed' || data.status === 'failed') {
            await loadVideos()
          }
        }
      }
    }, 10000) // 10秒ごとにポーリング

    return () => clearInterval(interval)
  }, [videos, loadVideos])

  const handleGenerate = async () => {
    setGenerating(true)
    await fetch(`/api/projects/${id}/generate`, { method: 'POST' })
    await load()
    setGenerating(false)
  }

  const handleGenerateVideo = async (sceneId: string) => {
    setGeneratingVideoFor(sceneId)
    try {
      const res = await fetch(`/api/projects/${id}/generate/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId }),
      })
      await loadVideos()
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? '動画生成の開始に失敗しました')
      }
    } finally {
      setGeneratingVideoFor(null)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!project) return <div className="text-center py-20 text-gray-500">読み込み中...</div>

  const imagePrompts = prompts.filter(p => p.promptType === 'image_generation')
  const videoPromptsList = prompts.filter(p => p.promptType === 'video_generation')
  const hasGenerated = project.status !== 'draft' && project.status !== 'ready'

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-gray-400 text-sm mt-1">{scenes.length}シーン</p>
        </div>
        {!hasGenerated && (
          <button
            onClick={handleGenerate}
            disabled={generating || scenes.length === 0}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'AI生成中...' : 'AI生成を開始'}
          </button>
        )}
      </div>

      {generating && (
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            <span className="font-semibold text-amber-400">AI生成処理中...</span>
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <p>1. Character Bible（同一人物性の確立）</p>
            <p>2. Scene Bible × {scenes.length}シーン</p>
            <p>3. Transition Bible × {scenes.length - 1}（連続性設計）</p>
            <p>4. 映像プロンプト生成</p>
            <p>5. ナレーション生成</p>
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="flex border-b border-gray-800 mb-6 overflow-x-auto">
        {[
          { key: 'overview', label: 'シーン一覧', icon: <BookOpen className="w-4 h-4" /> },
          { key: 'character', label: 'Character Bible', icon: <Film className="w-4 h-4" /> },
          { key: 'prompts', label: 'プロンプト', icon: <Sparkles className="w-4 h-4" /> },
          { key: 'narration', label: 'ナレーション', icon: <FileText className="w-4 h-4" /> },
          { key: 'videos', label: '動画生成 (Kling)', icon: <Video className="w-4 h-4" /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* シーン一覧 */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {scenes.map((scene, i) => (
            <div key={scene.id} className="border border-gray-800 rounded-xl overflow-hidden">
              <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-900 transition-colors"
                onClick={() => setExpandedScene(expandedScene === scene.id ? null : scene.id)}>
                <div className="flex items-center gap-4">
                  <span className="text-amber-400 font-mono text-sm w-8">#{i + 1}</span>
                  <div className="text-left">
                    <div className="font-semibold">{scene.title}</div>
                    <div className="text-sm text-gray-400">
                      {scene.ageAtScene}歳 · {scene.yearAtScene}年 · {scene.location}
                    </div>
                  </div>
                </div>
                {expandedScene === scene.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {expandedScene === scene.id && (
                <div className="px-5 pb-4 border-t border-gray-800 pt-4 space-y-2">
                  <p className="text-sm text-gray-300">{scene.eventSummary}</p>
                  {scene.emotionKeywords && scene.emotionKeywords.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {scene.emotionKeywords.map(k => (
                        <span key={k} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Character Bible */}
      {activeTab === 'character' && (
        characterBible ? (
          <div className="space-y-5">
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5">
              <h3 className="text-sm font-bold text-amber-400 mb-2">Consistency Anchor（全プロンプト先頭に注入）</h3>
              <p className="text-sm font-mono text-gray-200 leading-relaxed">{characterBible.consistencyAnchor}</p>
              <button onClick={() => copyToClipboard(characterBible.consistencyAnchor, 'anchor')}
                className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-white">
                {copied === 'anchor' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied === 'anchor' ? 'コピー済み' : 'コピー'}
              </button>
            </div>
            <div className="border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-400 mb-2">顔の核心特徴</h3>
              <p className="text-sm text-gray-200">{characterBible.faceCoreFeatures}</p>
            </div>
            <div className="border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-400 mb-3">年齢別変化マトリクス</h3>
              <div className="space-y-2">
                {Object.entries(characterBible.ageProgression).map(([period, data]) => (
                  <div key={period} className="grid grid-cols-4 gap-2 text-sm">
                    <span className="text-amber-400 font-mono">{period}</span>
                    <span className="text-gray-300 col-span-3">{data.hair} / {data.face}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={<Film className="w-10 h-10" />} message="まだ生成されていません" />
        )
      )}

      {/* プロンプト */}
      {activeTab === 'prompts' && (
        prompts.length > 0 ? (
          <div className="space-y-6">
            {scenes.map((scene, i) => {
              const imgP = imagePrompts.find(p => p.sceneId === scene.id)
              const vidP = videoPromptsList.find(p => p.sceneId === scene.id)
              return (
                <div key={scene.id} className="border border-gray-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-amber-400">Scene {i + 1}: {scene.title}</h3>
                  {imgP && (
                    <PromptBlock
                      label="画像生成プロンプト（FLUX / Midjourney）"
                      content={imgP.promptContent}
                      copyKey={`img-${scene.id}`}
                      copied={copied}
                      onCopy={copyToClipboard}
                    />
                  )}
                  {vidP && (
                    <PromptBlock
                      label="動画生成プロンプト（Runway / Kling）"
                      content={vidP.promptContent}
                      copyKey={`vid-${scene.id}`}
                      copied={copied}
                      onCopy={copyToClipboard}
                    />
                  )}
                  {imgP?.negativePrompt && (
                    <div>
                      <span className="text-xs text-red-400 font-bold">ネガティブプロンプト</span>
                      <div className="bg-gray-900 rounded-lg p-3 text-xs text-gray-500 font-mono mt-1">
                        {imgP.negativePrompt}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState icon={<Sparkles className="w-10 h-10" />} message="まだ生成されていません" />
        )
      )}

      {/* ナレーション */}
      {activeTab === 'narration' && (
        narrations.length > 0 ? (
          <div className="space-y-4">
            {scenes.map((scene, i) => {
              const narration = narrations.find(n => n.sceneId === scene.id)
              return narration ? (
                <div key={scene.id} className="border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-amber-400">Scene {i + 1}: {scene.title}</h3>
                    <button onClick={() => copyToClipboard(narration.textContent, `nar-${scene.id}`)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white">
                      {copied === `nar-${scene.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      コピー
                    </button>
                  </div>
                  <p className="text-sm text-gray-200 leading-loose">{narration.textContent}</p>
                </div>
              ) : null
            })}
          </div>
        ) : (
          <EmptyState icon={<FileText className="w-10 h-10" />} message="まだ生成されていません" />
        )
      )}

      {/* 動画生成タブ */}
      {activeTab === 'videos' && (
        !hasGenerated ? (
          <EmptyState icon={<Video className="w-10 h-10" />} message="先にAI生成を実行してください" />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              各シーンのKling動画を個別に生成します。1シーン10秒・16:9。生成には約2〜5分かかります。
            </p>
            {scenes.map((scene, i) => {
              const video = videos.find(v => v.sceneId === scene.id)
              const isGenerating = generatingVideoFor === scene.id

              return (
                <div key={scene.id} className="border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-amber-400 font-mono text-xs mr-2">Scene {i + 1}</span>
                      <span className="font-semibold">{scene.title}</span>
                      <span className="text-gray-400 text-sm ml-2">{scene.ageAtScene}歳</span>
                    </div>
                    <VideoStatusBadge video={video} />
                  </div>

                  {/* 動画プレイヤー */}
                  {video?.status === 'completed' && video.videoUrl && (
                    <div className="mb-3">
                      <video
                        src={video.videoUrl}
                        controls
                        className="w-full rounded-lg max-h-64 bg-black"
                      />
                    </div>
                  )}

                  {/* エラー表示 */}
                  {video?.status === 'failed' && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
                      <AlertCircle className="w-4 h-4" />
                      {video.errorMessage ?? '生成に失敗しました'}
                    </div>
                  )}

                  {/* 生成ボタン */}
                  {(!video || video.status === 'failed') && (
                    <button
                      onClick={() => handleGenerateVideo(scene.id)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      {isGenerating
                        ? <><Loader2 className="w-4 h-4 animate-spin" />開始中...</>
                        : <><Play className="w-4 h-4" />Klingで動画生成</>
                      }
                    </button>
                  )}

                  {video?.status === 'processing' && (
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中... 自動更新されます（2〜5分）
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

function VideoStatusBadge({ video }: { video: VideoRecord | undefined }) {
  if (!video) return <span className="text-xs text-gray-600">未生成</span>
  if (video.status === 'processing') return (
    <span className="flex items-center gap-1 text-xs text-amber-400">
      <Loader2 className="w-3 h-3 animate-spin" />生成中
    </span>
  )
  if (video.status === 'completed') return (
    <span className="flex items-center gap-1 text-xs text-green-400">
      <Check className="w-3 h-3" />完成
    </span>
  )
  if (video.status === 'failed') return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <AlertCircle className="w-3 h-3" />失敗
    </span>
  )
  return null
}

function PromptBlock({
  label, content, copyKey, copied, onCopy
}: {
  label: string; content: string; copyKey: string
  copied: string | null; onCopy: (text: string, key: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-bold">{label}</span>
        <button onClick={() => onCopy(content, copyKey)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-white">
          {copied === copyKey ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          コピー
        </button>
      </div>
      <div className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 font-mono leading-relaxed">
        {content}
      </div>
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="text-center py-12 text-gray-500">
      <div className="w-10 h-10 mx-auto mb-3 text-gray-700">{icon}</div>
      <p>{message}</p>
    </div>
  )
}
