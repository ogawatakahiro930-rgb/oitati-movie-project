'use client'

import { useEffect, useState, use, useCallback, useRef } from 'react'
import { Sparkles, BookOpen, Film, FileText, ChevronDown, ChevronUp, Copy, Check, Video, Play, Loader2, AlertCircle, Plus, Pencil, Trash2, X, Images, Upload } from 'lucide-react'

type Project = { id: string; title: string; status: string; personId: string; videoStyleId: string | null; createdAt: string }
type Scene = { id: string; orderIndex: number; title: string; ageAtScene: number | null; yearAtScene: number | null; location: string | null; eventSummary: string; emotionKeywords: string[] | null; emotionalStage: string | null; directionIntent?: string | null; innerMonologue?: string | null }
type CharacterBible = { id: string; faceCoreFeatures: string; consistencyAnchor: string; overallAtmosphere: string | null; ageProgression: Record<string, { hair: string; face: string; style: string }>; lifeStageStates: Record<string, { posture: string; gait: string; eyeExpression: string; mentalState: string }>; reviewed: boolean }
type Prompt = { id: string; sceneId: string | null; promptType: string; promptContent: string; negativePrompt: string | null; targetModel: string | null }
type Narration = { id: string; sceneId: string | null; textContent: string; emotionTone: string | null }
type VideoRecord = { id: string; sceneId: string | null; klingTaskId: string | null; klingPrompt: string | null; videoUrl: string | null; status: string; errorMessage: string | null; aspectRatio: string | null }
type MediaRecord = { id: string; mediaType: string; agePeriod: string | null; fileUrl: string | null; sceneId: string | null; createdAt: string | null }

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [characterBible, setCharacterBible] = useState<CharacterBible | null>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [narrations, setNarrations] = useState<Narration[]>([])
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [mediaList, setMediaList] = useState<MediaRecord[]>([])
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingVideoFor, setGeneratingVideoFor] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'character' | 'prompts' | 'narration' | 'videos' | 'media'>('overview')
  const [expandedScene, setExpandedScene] = useState<string | null>(null)
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
  const [addingScene, setAddingScene] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const loadVideos = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}/videos`)
    if (res.ok) setVideos(await res.json())
  }, [id])

  const loadMedia = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}/media`)
    if (res.ok) setMediaList(await res.json())
  }, [id])

  const load = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([fetch(`/api/projects/${id}`), fetch(`/api/projects/${id}/scenes`)])
    const p = await pRes.json()
    const s = await sRes.json()
    setProject(p); setScenes(s)
    await loadMedia()
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
  }, [id, loadVideos, loadMedia])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const processing = videos.filter(v => v.status === 'processing' && v.klingTaskId)
    if (processing.length === 0) return
    const interval = setInterval(async () => {
      for (const v of processing) {
        const res = await fetch(`/api/videos/${v.klingTaskId}/status`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'completed' || data.status === 'failed') await loadVideos()
        }
      }
    }, 10000)
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId }),
      })
      await loadVideos()
      if (!res.ok) { const d = await res.json(); alert(d.error ?? '動画生成の開始に失敗しました') }
    } finally { setGeneratingVideoFor(null) }
  }

  const handleSaveScene = async (sceneId: string, data: Partial<Scene>) => {
    await fetch(`/api/scenes/${sceneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setEditingSceneId(null)
    await load()
  }

  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm('このシーンを削除しますか？')) return
    await fetch(`/api/scenes/${sceneId}`, { method: 'DELETE' })
    await load()
  }

  const handleUpload = async (files: FileList, sceneId: string, agePeriod: string) => {
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      if (sceneId) fd.append('sceneId', sceneId)
      if (agePeriod) fd.append('agePeriod', agePeriod)
      await fetch(`/api/projects/${id}/media`, { method: 'POST', body: fd })
    }
    await loadMedia()
    setUploading(false)
  }

  const handleDeleteMedia = async (mediaId: string) => {
    await fetch(`/api/media/${mediaId}`, { method: 'DELETE' })
    await loadMedia()
  }

  const handleAddScene = async (data: Omit<Scene, 'id' | 'orderIndex'>) => {
    const nextIndex = scenes.length + 1
    await fetch(`/api/projects/${id}/scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, orderIndex: nextIndex }),
    })
    setAddingScene(false)
    await load()
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  if (!project) return <div className="text-center py-20 text-gray-400">読み込み中...</div>

  const hasGenerated = project.status !== 'draft' && project.status !== 'ready'
  const imagePrompts = prompts.filter(p => p.promptType === 'image_generation')
  const videoPromptsList = prompts.filter(p => p.promptType === 'video_generation')

  const tabs = [
    { key: 'overview',   label: 'シーン一覧',        icon: <BookOpen className="w-4 h-4" /> },
    { key: 'media',      label: `メディア${mediaList.length > 0 ? ` (${mediaList.length})` : ''}`, icon: <Images className="w-4 h-4" /> },
    { key: 'character',  label: 'Character Bible',   icon: <Film className="w-4 h-4" /> },
    { key: 'prompts',    label: 'プロンプト',         icon: <Sparkles className="w-4 h-4" /> },
    { key: 'narration',  label: 'ナレーション',       icon: <FileText className="w-4 h-4" /> },
    { key: 'videos',     label: '動画生成 (Kling)',   icon: <Video className="w-4 h-4" /> },
  ]

  return (
    <div>
      {/* ページヘッダー */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{project.title}</h1>
          <p className="text-gray-400 text-sm mt-1">{scenes.length}シーン登録済み</p>
        </div>
        {!hasGenerated && (
          <button onClick={handleGenerate} disabled={generating || scenes.length === 0}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors">
            <Sparkles className="w-4 h-4" />
            {generating ? 'AI生成中...' : 'AI生成を開始'}
          </button>
        )}
        {hasGenerated && (
          <span className="bg-green-50 text-green-600 border border-green-200 text-xs font-medium px-3 py-1.5 rounded-full">
            生成完了
          </span>
        )}
      </div>

      {generating && (
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            <span className="font-semibold text-amber-700">AI生成処理中...</span>
          </div>
          <div className="text-sm text-amber-600 space-y-1">
            <p>1. Character Bible（同一人物性の確立）</p>
            <p>2. Scene Bible × {scenes.length}シーン</p>
            <p>3. Transition Bible × {scenes.length - 1}（連続性設計）</p>
            <p>4. 映像プロンプト生成</p>
            <p>5. ナレーション生成</p>
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm mb-6">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* シーン一覧 */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {scenes.map((scene, i) => (
            <div key={scene.id} className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
              {editingSceneId === scene.id ? (
                <SceneForm
                  initial={scene}
                  onSave={data => handleSaveScene(scene.id, data)}
                  onCancel={() => setEditingSceneId(null)}
                />
              ) : (
                <>
                  <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-50/50 transition-colors"
                    onClick={() => setExpandedScene(expandedScene === scene.id ? null : scene.id)}>
                    <div className="flex items-center gap-4">
                      <span className="text-amber-500 font-bold text-sm bg-amber-50 w-8 h-8 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="text-left">
                        <div className="font-semibold text-gray-800">{scene.title}</div>
                        <div className="text-sm text-gray-400">{scene.ageAtScene}歳 · {scene.yearAtScene}年 · {scene.location}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingSceneId(scene.id); setExpandedScene(null) }}
                        className="p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                        title="編集">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteScene(scene.id) }}
                        className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="削除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {expandedScene === scene.id
                        ? <ChevronUp className="w-4 h-4 text-gray-300 ml-1" />
                        : <ChevronDown className="w-4 h-4 text-gray-300 ml-1" />}
                    </div>
                  </button>
                  {expandedScene === scene.id && (
                    <div className="px-5 pb-4 border-t border-amber-50 pt-4 space-y-2">
                      <p className="text-sm text-gray-600">{scene.eventSummary}</p>
                      {scene.emotionKeywords && scene.emotionKeywords.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {scene.emotionKeywords.map(k => (
                            <span key={k} className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* シーン追加 */}
          {addingScene ? (
            <div className="bg-white border-2 border-amber-300 rounded-2xl shadow-sm overflow-hidden">
              <SceneForm
                onSave={handleAddScene}
                onCancel={() => setAddingScene(false)}
                isNew
              />
            </div>
          ) : (
            scenes.length < 10 && (
              <button
                onClick={() => setAddingScene(true)}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-amber-200 rounded-2xl text-amber-500 hover:border-amber-400 hover:bg-amber-50/50 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" /> シーンを追加
              </button>
            )
          )}
        </div>
      )}

      {/* メディア */}
      {activeTab === 'media' && (
        <MediaTab
          mediaList={mediaList}
          scenes={scenes}
          uploading={uploading}
          onUpload={handleUpload}
          onDelete={handleDeleteMedia}
        />
      )}

      {/* Character Bible */}
      {activeTab === 'character' && (
        characterBible ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-amber-700 mb-2">Consistency Anchor（全プロンプトに注入）</h3>
              <p className="text-sm font-mono text-gray-700 leading-relaxed">{characterBible.consistencyAnchor}</p>
              <button onClick={() => copy(characterBible.consistencyAnchor, 'anchor')}
                className="mt-3 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
                {copied === 'anchor' ? <><Check className="w-3 h-3 text-green-500" />コピー済み</> : <><Copy className="w-3 h-3" />コピー</>}
              </button>
            </div>
            <div className="bg-white border border-amber-100 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-500 mb-2">顔の核心特徴</h3>
              <p className="text-sm text-gray-700">{characterBible.faceCoreFeatures}</p>
            </div>
            <div className="bg-white border border-amber-100 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-500 mb-3">年齢別変化マトリクス</h3>
              <div className="space-y-2">
                {Object.entries(characterBible.ageProgression).map(([period, data]) => (
                  <div key={period} className="grid grid-cols-4 gap-2 text-sm py-1 border-b border-gray-50 last:border-0">
                    <span className="text-amber-500 font-mono font-medium">{period}</span>
                    <span className="text-gray-600 col-span-3">{data.hair} / {data.face}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : <EmptyState message="先にAI生成を実行してください" />
      )}

      {/* プロンプト */}
      {activeTab === 'prompts' && (
        prompts.length > 0 ? (
          <div className="space-y-5">
            {scenes.map((scene, i) => {
              const imgP = imagePrompts.find(p => p.sceneId === scene.id)
              const vidP = videoPromptsList.find(p => p.sceneId === scene.id)
              return (
                <div key={scene.id} className="bg-white border border-amber-100 rounded-2xl shadow-sm p-5 space-y-4">
                  <h3 className="font-bold text-amber-600">Scene {i + 1}: {scene.title}</h3>
                  {imgP && <PromptBlock label="画像生成（FLUX / Midjourney）" content={imgP.promptContent} copyKey={`img-${scene.id}`} copied={copied} onCopy={copy} />}
                  {vidP && <PromptBlock label="動画生成（Runway / Kling）" content={vidP.promptContent} copyKey={`vid-${scene.id}`} copied={copied} onCopy={copy} />}
                  {imgP?.negativePrompt && (
                    <div>
                      <span className="text-xs text-red-500 font-bold">ネガティブプロンプト</span>
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-gray-500 font-mono mt-1">{imgP.negativePrompt}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : <EmptyState message="先にAI生成を実行してください" />
      )}

      {/* ナレーション */}
      {activeTab === 'narration' && (
        narrations.length > 0 ? (
          <div className="space-y-4">
            {scenes.map((scene, i) => {
              const narration = narrations.find(n => n.sceneId === scene.id)
              return narration ? (
                <div key={scene.id} className="bg-white border border-amber-100 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-amber-600">Scene {i + 1}: {scene.title}</h3>
                    <button onClick={() => copy(narration.textContent, `nar-${scene.id}`)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium">
                      {copied === `nar-${scene.id}` ? <><Check className="w-3 h-3 text-green-500" />コピー済み</> : <><Copy className="w-3 h-3" />コピー</>}
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 leading-loose">{narration.textContent}</p>
                </div>
              ) : null
            })}
          </div>
        ) : <EmptyState message="先にAI生成を実行してください" />
      )}

      {/* 動画生成 */}
      {activeTab === 'videos' && (
        !hasGenerated ? <EmptyState message="先にAI生成を実行してください" /> : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
              各シーンのKling動画を個別に生成します。1シーン10秒・16:9。生成には約2〜5分かかります。
            </div>
            {scenes.map((scene, i) => {
              const video = videos.find(v => v.sceneId === scene.id)
              const isGenerating = generatingVideoFor === scene.id
              return (
                <div key={scene.id} className="bg-white border border-amber-100 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-amber-500 font-bold text-sm bg-amber-50 w-8 h-8 rounded-full flex items-center justify-center">{i + 1}</span>
                      <div>
                        <div className="font-semibold text-gray-800">{scene.title}</div>
                        <div className="text-xs text-gray-400">{scene.ageAtScene}歳</div>
                      </div>
                    </div>
                    <VideoStatusBadge video={video} />
                  </div>

                  {video?.status === 'completed' && video.videoUrl && (
                    <div className="mb-3">
                      <video src={video.videoUrl} controls className="w-full rounded-xl max-h-64 bg-gray-100" />
                    </div>
                  )}
                  {video?.status === 'failed' && (
                    <div className="flex items-center gap-2 text-red-500 text-sm mb-3 bg-red-50 border border-red-100 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {video.errorMessage ?? '生成に失敗しました'}
                    </div>
                  )}
                  {(!video || video.status === 'failed') && (
                    <button onClick={() => handleGenerateVideo(scene.id)} disabled={isGenerating}
                      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-100 disabled:text-gray-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                      {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />開始中...</> : <><Play className="w-4 h-4" />Klingで動画生成</>}
                    </button>
                  )}
                  {video?.status === 'processing' && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 rounded-xl px-3 py-2">
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
  if (!video) return <span className="text-xs text-gray-300 bg-gray-50 border border-gray-100 px-2 py-1 rounded-full">未生成</span>
  if (video.status === 'processing') return <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full"><Loader2 className="w-3 h-3 animate-spin" />生成中</span>
  if (video.status === 'completed') return <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-full"><Check className="w-3 h-3" />完成</span>
  if (video.status === 'failed') return <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-100 px-2 py-1 rounded-full"><AlertCircle className="w-3 h-3" />失敗</span>
  return null
}

function PromptBlock({ label, content, copyKey, copied, onCopy }: { label: string; content: string; copyKey: string; copied: string | null; onCopy: (t: string, k: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-gray-500">{label}</span>
        <button onClick={() => onCopy(content, copyKey)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium">
          {copied === copyKey ? <><Check className="w-3 h-3 text-green-500" />コピー済み</> : <><Copy className="w-3 h-3" />コピー</>}
        </button>
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-600 font-mono leading-relaxed">{content}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-amber-100">
      <p className="text-gray-400">{message}</p>
    </div>
  )
}

const AGE_PERIODS = ['幼少期', '小学校時代', '中学・高校時代', '大学・青年期', '社会人時代', '結婚・家族', '現在']

function MediaTab({
  mediaList, scenes, uploading, onUpload, onDelete,
}: {
  mediaList: MediaRecord[]
  scenes: Scene[]
  uploading: boolean
  onUpload: (files: FileList, sceneId: string, agePeriod: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [selectedSceneId, setSelectedSceneId] = useState('')
  const [agePeriod, setAgePeriod] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const photos = mediaList.filter(m => m.mediaType === 'photo')
  const videos = mediaList.filter(m => m.mediaType === 'video')

  // 年代別グループ（アップロード順を保持）
  const photoGroups: { period: string; items: MediaRecord[] }[] = []
  const seenPeriods = new Set<string>()
  for (const m of photos) {
    const period = m.agePeriod ?? '未分類'
    if (!seenPeriods.has(period)) {
      seenPeriods.add(period)
      photoGroups.push({ period, items: [] })
    }
    photoGroups.find(g => g.period === period)!.items.push(m)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files, selectedSceneId, agePeriod)
  }

  return (
    <div className="space-y-6">
      {/* アップロードパネル */}
      <div className="bg-white border border-amber-100 rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-500 mb-4">写真・動画を追加</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">年代 <span className="text-amber-500">*</span></label>
            <input
              list="age-period-list"
              value={agePeriod}
              onChange={e => setAgePeriod(e.target.value)}
              placeholder="幼少期、小学校時代..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
            />
            <datalist id="age-period-list">
              {AGE_PERIODS.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">シーンに紐付け（任意）</label>
            <select
              value={selectedSceneId}
              onChange={e => setSelectedSceneId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 bg-white focus:outline-none focus:border-amber-400 transition"
            >
              <option value="">紐付けない</option>
              {scenes.map((s, i) => (
                <option key={s.id} value={s.id}>Scene {i + 1}: {s.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-7 h-7 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">ドラッグ＆ドロップ、またはクリックして選択（複数可）</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*"
            multiple
            onChange={e => { if (e.target.files) { onUpload(e.target.files, selectedSceneId, agePeriod); e.target.value = '' } }}
          />
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-amber-600 text-sm mt-3">
            <Loader2 className="w-4 h-4 animate-spin" />アップロード中...
          </div>
        )}
      </div>

      {/* 写真 — 年代別 */}
      {photoGroups.map(({ period, items }) => (
        <div key={period}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">{period}</span>
            <span className="text-xs text-gray-400">{items.length}件</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {items.map(m => {
              const scene = scenes.find(s => s.id === m.sceneId)
              return (
                <div key={m.id} className="relative group bg-white border border-amber-100 rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.fileUrl ?? ''} alt="" className="w-full aspect-square object-cover" />
                  {scene && (
                    <div className="px-2 py-1 text-xs text-amber-600 truncate bg-amber-50 border-t border-amber-100">
                      {scene.title}
                    </div>
                  )}
                  <button
                    onClick={() => onDelete(m.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* 動画 */}
      {videos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">動画</span>
            <span className="text-xs text-gray-400">{videos.length}件</span>
          </div>
          <div className="space-y-3">
            {videos.map(m => {
              const scene = scenes.find(s => s.id === m.sceneId)
              return (
                <div key={m.id} className="bg-white border border-amber-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.agePeriod && (
                        <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">{m.agePeriod}</span>
                      )}
                      {scene && <span className="text-sm text-gray-500">{scene.title}</span>}
                    </div>
                    <button onClick={() => onDelete(m.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <video src={m.fileUrl ?? ''} controls className="w-full rounded-xl max-h-64 bg-gray-100" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mediaList.length === 0 && !uploading && (
        <div className="text-center py-12 text-gray-300 text-sm">
          まだメディアがありません
        </div>
      )}
    </div>
  )
}

const EMOTIONAL_STAGES = ['hope', 'challenge', 'effort', 'turning_point', 'success', 'legacy', 'message']
const EMOTIONAL_LABELS: Record<string, string> = {
  hope: '希望', challenge: '挑戦', effort: '努力',
  turning_point: '転機', success: '成功', legacy: '功績', message: 'メッセージ'
}

const inputCls = 'w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition'
const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

function SceneForm({
  initial,
  onSave,
  onCancel,
  isNew = false,
}: {
  initial?: Scene
  onSave: (data: Omit<Scene, 'id' | 'orderIndex'>) => Promise<void>
  onCancel: () => void
  isNew?: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [age, setAge] = useState(initial?.ageAtScene?.toString() ?? '')
  const [year, setYear] = useState(initial?.yearAtScene?.toString() ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [eventSummary, setEventSummary] = useState(initial?.eventSummary ?? '')
  const [innerMonologue, setInnerMonologue] = useState('')
  const [emotionalStage, setEmotionalStage] = useState(initial?.emotionalStage ?? 'hope')
  const [emotionKeywords, setEmotionKeywords] = useState<string[]>(initial?.emotionKeywords ?? [])
  const [kwInput, setKwInput] = useState('')
  const [saving, setSaving] = useState(false)

  const addKeyword = () => {
    if (kwInput.trim() && !emotionKeywords.includes(kwInput.trim())) {
      setEmotionKeywords([...emotionKeywords, kwInput.trim()])
      setKwInput('')
    }
  }

  const handleSave = async () => {
    if (!title || !eventSummary) return
    setSaving(true)
    await onSave({
      title,
      ageAtScene: age ? parseInt(age) : null,
      yearAtScene: year ? parseInt(year) : null,
      location: location || null,
      eventSummary,
      emotionKeywords,
      directionIntent: null,
      emotionalStage,
      innerMonologue: innerMonologue || null,
    })
    setSaving(false)
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-amber-600">
          {isNew ? '新しいシーン' : 'シーンを編集'}
        </span>
        <button onClick={onCancel} className="text-gray-300 hover:text-gray-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>タイトル *</label>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="野球との出会い" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>年齢</label>
            <input type="number" className={inputCls} value={age} onChange={e => setAge(e.target.value)} placeholder="8" />
          </div>
          <div>
            <label className={labelCls}>西暦</label>
            <input type="number" className={inputCls} value={year} onChange={e => setYear(e.target.value)} placeholder="1958" />
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>場所</label>
        <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="地元の野球グラウンド" />
      </div>

      <div>
        <label className={labelCls}>出来事・概要 *</label>
        <textarea rows={2} className={`${inputCls} resize-none`} value={eventSummary} onChange={e => setEventSummary(e.target.value)}
          placeholder="初めて野球グローブを手にした日。先輩に連れられてグラウンドへ。" />
      </div>

      <div>
        <label className={labelCls}>内面・心の声</label>
        <input className={inputCls} value={innerMonologue} onChange={e => setInnerMonologue(e.target.value)}
          placeholder="「これだ。これが僕のやるべきことだ」" />
      </div>

      <div>
        <label className={labelCls}>感情ステージ</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {EMOTIONAL_STAGES.map(s => (
            <button key={s} onClick={() => setEmotionalStage(s)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                emotionalStage === s
                  ? 'border-amber-400 bg-amber-50 text-amber-600'
                  : 'border-gray-200 text-gray-400 hover:border-amber-200'
              }`}>
              {EMOTIONAL_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>感情キーワード</label>
        <div className="flex gap-2 mb-2">
          <input className={inputCls} value={kwInput} onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()} placeholder="喜び、緊張、希望..." />
          <button onClick={addKeyword} className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 px-3 rounded-xl transition-colors text-sm">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {emotionKeywords.map(k => (
            <span key={k} className="flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-100 text-xs px-2.5 py-1 rounded-full">
              {k}
              <button onClick={() => setEmotionKeywords(emotionKeywords.filter(x => x !== k))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 py-2 rounded-xl text-sm transition-colors">
          キャンセル
        </button>
        <button onClick={handleSave} disabled={saving || !title || !eventSummary}
          className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold py-2 rounded-xl text-sm transition-colors">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
