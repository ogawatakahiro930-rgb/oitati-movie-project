'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Plus, X } from 'lucide-react'

const VIDEO_STYLES = [
  { key: 'emotional',    name: '感動系',     desc: '温かみと涙を大切に',   emoji: '🎭' },
  { key: 'family',       name: '家族愛',     desc: '絆と成長のストーリー', emoji: '👨‍👩‍👧‍👦' },
  { key: 'entrepreneur', name: '経営者人生', desc: '挑戦と決断の記録',     emoji: '💼' },
  { key: 'passionate',   name: '熱血人生',   desc: '情熱とドラマ',         emoji: '🔥' },
  { key: 'challenge',    name: '挑戦の人生', desc: '変革と革新',           emoji: '🚀' },
  { key: 'community',    name: '地域貢献',   desc: '人と社会への愛',       emoji: '🏘️' },
]

const EMOTIONAL_STAGES = ['hope', 'challenge', 'effort', 'turning_point', 'success', 'legacy', 'message']
const EMOTIONAL_LABELS: Record<string, string> = {
  hope: '希望', challenge: '挑戦', effort: '努力',
  turning_point: '転機', success: '成功', legacy: '功績', message: 'メッセージ'
}

type Scene = {
  title: string; ageAtScene: string; yearAtScene: string; location: string
  eventSummary: string; emotionKeywords: string[]; directionIntent: string
  emotionalStage: string; innerMonologue: string
}
const emptyScene = (): Scene => ({
  title: '', ageAtScene: '', yearAtScene: '', location: '',
  eventSummary: '', emotionKeywords: [], directionIntent: '',
  emotionalStage: 'hope', innerMonologue: '',
})

const inputCls = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition'
const labelCls = 'block text-sm font-medium text-gray-600 mb-1.5'

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [occupation, setOccupation] = useState('')
  const [familyStructure, setFamilyStructure] = useState('')
  const [personalityNotes, setPersonalityNotes] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [kwInput, setKwInput] = useState('')
  const [styleKey, setStyleKey] = useState('')
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

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
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
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i]
        await fetch(`/api/projects/${project.id}/scenes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderIndex: i + 1, title: s.title,
            ageAtScene: s.ageAtScene ? parseInt(s.ageAtScene) : undefined,
            yearAtScene: s.yearAtScene ? parseInt(s.yearAtScene) : undefined,
            location: s.location, eventSummary: s.eventSummary,
            emotionKeywords: s.emotionKeywords, directionIntent: s.directionIntent,
            emotionalStage: s.emotionalStage, innerMonologue: s.innerMonologue,
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
      <div className="flex items-center gap-2 mb-8 bg-white rounded-2xl px-6 py-4 shadow-sm border border-amber-100">
        {['人物情報', 'スタイル', 'シーン設定'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === i + 1 ? 'bg-amber-500 text-white shadow-sm' :
              step > i + 1  ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>{step > i + 1 ? '✓' : i + 1}</div>
            <span className={`text-sm font-medium ${step === i + 1 ? 'text-amber-600' : step > i + 1 ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
            {i < 2 && <ChevronRight className="w-4 h-4 text-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-5">
          <h2 className="text-xl font-bold text-gray-800">人物情報</h2>
          <div>
            <label className={labelCls}>プロジェクトタイトル <span className="text-red-400">*</span></label>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="田中太郎さんの生い立ちムービー" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>お名前 <span className="text-red-400">*</span></label>
              <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="田中 太郎" />
            </div>
            <div>
              <label className={labelCls}>生まれ年</label>
              <input type="number" className={inputCls} value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1950" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>出身地</label>
              <input className={inputCls} value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder="東京都 杉並区" />
            </div>
            <div>
              <label className={labelCls}>職業</label>
              <input className={inputCls} value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="会社経営者" />
            </div>
          </div>
          <div>
            <label className={labelCls}>家族構成</label>
            <input className={inputCls} value={familyStructure} onChange={e => setFamilyStructure(e.target.value)} placeholder="妻・長男・長女・孫2人" />
          </div>
          <div>
            <label className={labelCls}>人柄メモ（ヒアリングから）</label>
            <textarea rows={3} className={`${inputCls} resize-none`} value={personalityNotes} onChange={e => setPersonalityNotes(e.target.value)}
              placeholder="野球一筋の青春。起業で苦労したが絶対諦めない性格。笑顔が印象的。" />
          </div>
          <div>
            <label className={labelCls}>キーワード</label>
            <div className="flex gap-2 mb-2">
              <input className={inputCls} value={kwInput} onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword()} placeholder="野球、起業、地域貢献..." />
              <button onClick={addKeyword} className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 px-3 rounded-xl transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map(k => (
                <span key={k} className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-sm px-3 py-1 rounded-full">
                  {k}
                  <button onClick={() => setKeywords(keywords.filter(x => x !== k))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setStep(2)} disabled={!title || !fullName}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            次へ <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-5">
          <h2 className="text-xl font-bold text-gray-800">動画の方向性</h2>
          <div className="grid grid-cols-2 gap-3">
            {VIDEO_STYLES.map(s => (
              <button key={s.key} onClick={() => setStyleKey(s.key)}
                className={`border rounded-xl p-4 text-left transition-all ${
                  styleKey === s.key
                    ? 'border-amber-400 bg-amber-50 shadow-sm'
                    : 'border-gray-200 hover:border-amber-200 hover:bg-amber-50/50'
                }`}>
                <div className="text-2xl mb-2">{s.emoji}</div>
                <div className="font-semibold text-gray-800">{s.name}</div>
                <div className="text-sm text-gray-400 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" /> 戻る
            </button>
            <button onClick={() => setStep(3)} disabled={!styleKey}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              次へ <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">人生のハイライト（{scenes.length}シーン）</h2>
              {scenes.length < 10 && (
                <button onClick={() => setScenes([...scenes, emptyScene()])}
                  className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-500 font-medium">
                  <Plus className="w-4 h-4" /> シーン追加
                </button>
              )}
            </div>
          </div>

          {scenes.map((scene, i) => (
            <div key={i} className="bg-white border border-amber-100 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full">Scene {i + 1}</span>
                {scenes.length > 1 && (
                  <button onClick={() => setScenes(scenes.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>シーンタイトル <span className="text-red-400">*</span></label>
                  <input className={inputCls} value={scene.title} onChange={e => updateScene(i, 'title', e.target.value)} placeholder="野球との出会い" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>年齢</label>
                    <input type="number" className={inputCls} value={scene.ageAtScene} onChange={e => updateScene(i, 'ageAtScene', e.target.value)} placeholder="8" />
                  </div>
                  <div>
                    <label className={labelCls}>西暦</label>
                    <input type="number" className={inputCls} value={scene.yearAtScene} onChange={e => updateScene(i, 'yearAtScene', e.target.value)} placeholder="1958" />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>場所</label>
                <input className={inputCls} value={scene.location} onChange={e => updateScene(i, 'location', e.target.value)} placeholder="地元の野球グラウンド" />
              </div>
              <div>
                <label className={labelCls}>出来事・概要 <span className="text-red-400">*</span></label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={scene.eventSummary} onChange={e => updateScene(i, 'eventSummary', e.target.value)}
                  placeholder="初めて野球グローブを手にした日。先輩に連れられてグラウンドへ。" />
              </div>
              <div>
                <label className={labelCls}>内面・心の声</label>
                <input className={inputCls} value={scene.innerMonologue} onChange={e => updateScene(i, 'innerMonologue', e.target.value)}
                  placeholder="「これだ。これが僕のやるべきことだ」" />
              </div>
              <div>
                <label className={labelCls}>感情ステージ</label>
                <div className="flex flex-wrap gap-2">
                  {EMOTIONAL_STAGES.map(s => (
                    <button key={s} onClick={() => updateScene(i, 'emotionalStage', s)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        scene.emotionalStage === s
                          ? 'border-amber-400 bg-amber-50 text-amber-600'
                          : 'border-gray-200 text-gray-400 hover:border-amber-200 hover:text-amber-500'
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
              className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" /> 戻る
            </button>
            <button onClick={handleSubmit} disabled={submitting || scenes.some(s => !s.title || !s.eventSummary)}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold py-3 rounded-xl transition-colors">
              {submitting ? '作成中...' : 'プロジェクト作成'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
