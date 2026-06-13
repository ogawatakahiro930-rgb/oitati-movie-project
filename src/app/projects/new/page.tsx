'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Plus, X } from 'lucide-react'

const VIDEO_STYLES = [
  { key: 'emotional', name: '感動系', desc: '温かみと涙を大切に', tone: 'warm' },
  { key: 'family', name: '家族愛', desc: '絆と成長のストーリー', tone: 'nostalgic' },
  { key: 'entrepreneur', name: '経営者人生', desc: '挑戦と決断の記録', tone: 'dramatic' },
  { key: 'passionate', name: '熱血人生', desc: '情熱とドラマ', tone: 'dynamic' },
  { key: 'challenge', name: '挑戦の人生', desc: '変革と革新', tone: 'inspiring' },
  { key: 'community', name: '地域貢献', desc: '人と社会への愛', tone: 'heartwarming' },
]

const EMOTIONAL_STAGES = ['hope', 'challenge', 'effort', 'turning_point', 'success', 'legacy', 'message']
const EMOTIONAL_LABELS: Record<string, string> = {
  hope: '希望', challenge: '挑戦', effort: '努力',
  turning_point: '転機', success: '成功', legacy: '功績', message: 'メッセージ'
}

type Scene = {
  title: string
  ageAtScene: string
  yearAtScene: string
  location: string
  eventSummary: string
  emotionKeywords: string[]
  directionIntent: string
  emotionalStage: string
  innerMonologue: string
}

const emptyScene = (): Scene => ({
  title: '', ageAtScene: '', yearAtScene: '', location: '',
  eventSummary: '', emotionKeywords: [], directionIntent: '',
  emotionalStage: 'hope', innerMonologue: '',
})

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: 人物情報
  const [title, setTitle] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [occupation, setOccupation] = useState('')
  const [familyStructure, setFamilyStructure] = useState('')
  const [personalityNotes, setPersonalityNotes] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [kwInput, setKwInput] = useState('')

  // Step 2: スタイル
  const [styleKey, setStyleKey] = useState('')

  // Step 3: シーン
  const [scenes, setScenes] = useState<Scene[]>([emptyScene()])

  const addKeyword = () => {
    if (kwInput.trim() && !keywords.includes(kwInput.trim())) {
      setKeywords([...keywords, kwInput.trim()])
      setKwInput('')
    }
  }

  const updateScene = (i: number, field: keyof Scene, value: string | string[]) => {
    const updated = [...scenes]
    updated[i] = { ...updated[i], [field]: value }
    setScenes(updated)
  }

  const addEmotion = (i: number, emotion: string) => {
    const scene = scenes[i]
    if (emotion.trim() && !scene.emotionKeywords.includes(emotion.trim())) {
      updateScene(i, 'emotionKeywords', [...scene.emotionKeywords, emotion.trim()])
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // プロジェクト作成
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          person: {
            fullName, birthYear: birthYear ? parseInt(birthYear) : undefined,
            birthPlace, occupation, familyStructure, personalityNotes,
            specialKeywords: keywords,
          },
        }),
      })
      const { project } = await res.json()

      // シーン登録
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i]
        await fetch(`/api/projects/${project.id}/scenes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderIndex: i + 1,
            title: s.title,
            ageAtScene: s.ageAtScene ? parseInt(s.ageAtScene) : undefined,
            yearAtScene: s.yearAtScene ? parseInt(s.yearAtScene) : undefined,
            location: s.location,
            eventSummary: s.eventSummary,
            emotionKeywords: s.emotionKeywords,
            directionIntent: s.directionIntent,
            emotionalStage: s.emotionalStage,
            innerMonologue: s.innerMonologue,
          }),
        })
      }

      router.push(`/projects/${project.id}`)
    } catch (e) {
      console.error(e)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* ステップインジケーター */}
      <div className="flex items-center gap-2 mb-8">
        {['人物情報', 'スタイル', 'シーン設定'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === i + 1 ? 'bg-amber-500 text-black' :
              step > i + 1 ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
            }`}>{i + 1}</div>
            <span className={`text-sm ${step === i + 1 ? 'text-white' : 'text-gray-500'}`}>{label}</span>
            {i < 2 && <ChevronRight className="w-4 h-4 text-gray-600" />}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold">人物情報</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1">プロジェクトタイトル *</label>
            <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
              value={title} onChange={e => setTitle(e.target.value)} placeholder="田中太郎さんの生い立ちムービー" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">お名前 *</label>
              <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                value={fullName} onChange={e => setFullName(e.target.value)} placeholder="田中 太郎" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">生まれ年</label>
              <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1950" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">出身地</label>
              <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder="東京都 杉並区" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">職業</label>
              <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="会社経営者" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">家族構成</label>
            <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
              value={familyStructure} onChange={e => setFamilyStructure(e.target.value)} placeholder="妻・長男・長女・孫2人" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">人柄メモ（ヒアリングから）</label>
            <textarea rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500 resize-none"
              value={personalityNotes} onChange={e => setPersonalityNotes(e.target.value)}
              placeholder="野球一筋の青春。起業で苦労したが絶対諦めない性格。笑顔が印象的。" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">キーワード</label>
            <div className="flex gap-2 mb-2">
              <input className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                value={kwInput} onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEmotion(0, kwInput)}
                placeholder="野球、起業、地域貢献..." />
              <button onClick={() => { if (kwInput.trim()) { setKeywords([...keywords, kwInput.trim()]); setKwInput('') } }}
                className="bg-gray-700 hover:bg-gray-600 px-3 rounded-lg">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map(k => (
                <span key={k} className="flex items-center gap-1 bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-full">
                  {k}
                  <button onClick={() => setKeywords(keywords.filter(x => x !== k))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!title || !fullName}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            次へ <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold">動画の方向性</h2>
          <div className="grid grid-cols-2 gap-3">
            {VIDEO_STYLES.map(s => (
              <button key={s.key} onClick={() => setStyleKey(s.key)}
                className={`border rounded-xl p-4 text-left transition-all ${
                  styleKey === s.key
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-gray-400 mt-1">{s.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex-1 border border-gray-700 hover:bg-gray-800 py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" /> 戻る
            </button>
            <button onClick={() => setStep(3)} disabled={!styleKey}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              次へ <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">人生のハイライト（{scenes.length}シーン）</h2>
            {scenes.length < 10 && (
              <button onClick={() => setScenes([...scenes, emptyScene()])}
                className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300">
                <Plus className="w-4 h-4" /> シーン追加
              </button>
            )}
          </div>

          {scenes.map((scene, i) => (
            <div key={i} className="border border-gray-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-400">Scene {i + 1}</span>
                {scenes.length > 1 && (
                  <button onClick={() => setScenes(scenes.filter((_, j) => j !== i))}
                    className="text-gray-500 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">シーンタイトル *</label>
                  <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    value={scene.title} onChange={e => updateScene(i, 'title', e.target.value)} placeholder="野球との出会い" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">年齢</label>
                    <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                      value={scene.ageAtScene} onChange={e => updateScene(i, 'ageAtScene', e.target.value)} placeholder="8" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">西暦</label>
                    <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                      value={scene.yearAtScene} onChange={e => updateScene(i, 'yearAtScene', e.target.value)} placeholder="1958" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">場所</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  value={scene.location} onChange={e => updateScene(i, 'location', e.target.value)} placeholder="地元の野球グラウンド" />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">出来事・概要 *</label>
                <textarea rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
                  value={scene.eventSummary} onChange={e => updateScene(i, 'eventSummary', e.target.value)}
                  placeholder="初めて野球グローブを手にした日。先輩に連れられてグラウンドへ。" />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">内面・心の声</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  value={scene.innerMonologue} onChange={e => updateScene(i, 'innerMonologue', e.target.value)}
                  placeholder="「これだ。これが僕のやるべきことだ」" />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">感情ステージ</label>
                <div className="flex flex-wrap gap-2">
                  {EMOTIONAL_STAGES.map(s => (
                    <button key={s} onClick={() => updateScene(i, 'emotionalStage', s)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        scene.emotionalStage === s
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}>
                      {EMOTIONAL_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)}
              className="flex-1 border border-gray-700 hover:bg-gray-800 py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" /> 戻る
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || scenes.some(s => !s.title || !s.eventSummary)}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold py-3 rounded-lg transition-colors"
            >
              {submitting ? '作成中...' : 'プロジェクト作成'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
