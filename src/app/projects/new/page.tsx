'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Plus, X, Sparkles, Loader2 } from 'lucide-react'

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
const SCENE_COUNT_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10]

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
  const [suggesting, setSuggesting] = useState(false)

  // Step 1
  const [title, setTitle] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [occupation, setOccupation] = useState('')
  const [familyStructure, setFamilyStructure] = useState('')
  const [personalityNotes, setPersonalityNotes] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [kwInput, setKwInput] = useState('')

  // Step 2
  const [styleKey, setStyleKey] = useState('')

  // Step 3
  const [lifeStoryText, setLifeStoryText] = useState('')
  const [sceneCount, setSceneCount] = useState(5)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [hasSuggested, setHasSuggested] = useState(false)

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

  const addSceneKeyword = (sceneIdx: number, kw: string) => {
    if (!kw.trim()) return
    const scene = scenes[sceneIdx]
    if (!scene.emotionKeywords.includes(kw.trim())) {
      updateScene(sceneIdx, 'emotionKeywords', [...scene.emotionKeywords, kw.trim()])
    }
  }

  const handleSuggest = async () => {
    if (!lifeStoryText.trim()) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/projects/suggest-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lifeStoryText,
          sceneCount,
          personInfo: {
            fullName, birthYear: birthYear ? parseInt(birthYear) : undefined,
            birthPlace, occupation, familyStructure, personalityNotes,
            specialKeywords: keywords,
          },
          styleKey,
        }),
      })
      const data = await res.json()
      if (data.scenes) {
        setScenes(data.scenes.map((s: Omit<Scene, 'directionIntent'>) => ({
          ...s,
          ageAtScene: s.ageAtScene != null ? String(s.ageAtScene) : '',
          yearAtScene: s.yearAtScene != null ? String(s.yearAtScene) : '',
          directionIntent: '',
        })))
        setHasSuggested(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSuggesting(false)
    }
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
            specialKeywords: keywords, lifeStoryText: lifeStoryText || undefined,
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

  const canSubmit = scenes.length > 0 && scenes.every(s => s.title && s.eventSummary)

  return (
    <div className="max-w-2xl mx-auto">
      {/* ステップインジケーター */}
      <div className="flex items-center gap-2 mb-8 bg-white rounded-2xl px-6 py-4 shadow-sm border border-amber-100">
        {['人物情報', 'スタイル', 'シーン生成'].map((label, i) => (
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
            <label className={labelCls}>人柄メモ</label>
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
          {/* 生い立ちテキスト入力パネル */}
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">生い立ちを入力</h2>
              <p className="text-sm text-gray-400">インタビュー内容や記録テキストを貼り付けてください。AIが自動でシーンを提案します。</p>
            </div>

            <div>
              <label className={labelCls}>生い立ちテキスト</label>
              <textarea
                rows={8}
                className={`${inputCls} resize-y`}
                value={lifeStoryText}
                onChange={e => setLifeStoryText(e.target.value)}
                placeholder={`例：\n1950年、東京都杉並区に生まれる。父は大工、母は専業主婦の家庭で育った。小学3年生の時に近所の野球チームに入団し、野球に夢中になる。中学では部活動でピッチャーとして活躍し、県大会に出場した。\n\n高校卒業後は地元の会社に就職。営業マンとして働きながら夜間学校に通い、経営を学んだ。30歳で独立し、建材会社を設立。最初の3年間は赤字続きで苦労したが、品質へのこだわりと誠実な仕事ぶりが評判を呼び、徐々に事業が軌道に乗り始めた...`}
              />
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className={labelCls}>抽出するシーン数</label>
                <div className="flex gap-2 flex-wrap">
                  {SCENE_COUNT_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => setSceneCount(n)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold border transition-colors ${
                        sceneCount === n
                          ? 'border-amber-400 bg-amber-500 text-white shadow-sm'
                          : 'border-gray-200 text-gray-500 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSuggest}
              disabled={!lifeStoryText.trim() || suggesting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-300 text-white font-semibold py-3 rounded-xl shadow-sm transition-all"
            >
              {suggesting
                ? <><Loader2 className="w-4 h-4 animate-spin" />AIがシーンを分析中...</>
                : <><Sparkles className="w-4 h-4" />{hasSuggested ? `${sceneCount}シーンで再提案する` : `AIで${sceneCount}シーンを提案する`}</>
              }
            </button>
          </div>

          {/* AI提案結果 / シーン一覧 */}
          {scenes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  提案されたシーン（編集できます）
                </h3>
                <span className="text-xs text-gray-400">{scenes.length}シーン</span>
              </div>

              {scenes.map((scene, i) => (
                <SceneCard
                  key={i}
                  index={i}
                  scene={scene}
                  total={scenes.length}
                  onUpdate={(field, value) => updateScene(i, field, value)}
                  onDelete={() => setScenes(scenes.filter((_, j) => j !== i))}
                  onAddKeyword={kw => addSceneKeyword(i, kw)}
                />
              ))}
            </div>
          )}

          {/* シーン追加ボタン */}
          {scenes.length < 10 && (
            <button
              onClick={() => setScenes([...scenes, emptyScene()])}
              className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-amber-200 rounded-2xl text-amber-500 hover:border-amber-400 hover:bg-amber-50/50 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> シーンを手動で追加
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(2)}
              className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" /> 戻る
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="flex-2 flex-grow-[2] bg-amber-500 hover:bg-amber-400 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {submitting ? '作成中...' : `プロジェクト作成（${scenes.length}シーン）`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type SceneCardProps = {
  index: number
  scene: Scene
  total: number
  onUpdate: (field: keyof Scene, value: string | string[]) => void
  onDelete: () => void
  onAddKeyword: (kw: string) => void
}

function SceneCard({ index, scene, total, onUpdate, onDelete, onAddKeyword }: SceneCardProps) {
  const [kwInput, setKwInput] = useState('')
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
      {/* ヘッダー（常に表示） */}
      <div className="flex items-center gap-3 px-5 py-3.5">
        <span className="text-amber-500 font-bold text-sm bg-amber-50 w-7 h-7 rounded-full flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <input
            className="w-full text-sm font-semibold text-gray-800 bg-transparent border-0 border-b border-transparent focus:border-amber-300 focus:outline-none py-0.5 placeholder-gray-300"
            value={scene.title}
            onChange={e => onUpdate('title', e.target.value)}
            placeholder="シーンタイトルを入力"
          />
          {!expanded && scene.eventSummary && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{scene.eventSummary}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-gray-400 hover:text-amber-500 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
          >
            {expanded ? '閉じる' : '編集'}
          </button>
          {total > 1 && (
            <button onClick={onDelete} className="text-gray-300 hover:text-red-400 p-1 rounded-lg hover:bg-red-50 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 展開エリア */}
      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-amber-50 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">年齢</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-amber-400 transition"
                value={scene.ageAtScene} onChange={e => onUpdate('ageAtScene', e.target.value)} placeholder="8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">西暦</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-amber-400 transition"
                value={scene.yearAtScene} onChange={e => onUpdate('yearAtScene', e.target.value)} placeholder="1958" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">場所</label>
              <input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-amber-400 transition"
                value={scene.location} onChange={e => onUpdate('location', e.target.value)} placeholder="場所" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">出来事・概要 <span className="text-red-400">*</span></label>
            <textarea rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
              value={scene.eventSummary} onChange={e => onUpdate('eventSummary', e.target.value)} placeholder="出来事の概要" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">心の声</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-amber-400 transition"
              value={scene.innerMonologue} onChange={e => onUpdate('innerMonologue', e.target.value)} placeholder="「これだ。これが僕のやるべきことだ」" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">感情ステージ</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOTIONAL_STAGES.map(s => (
                <button key={s} onClick={() => onUpdate('emotionalStage', s)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    scene.emotionalStage === s
                      ? 'border-amber-400 bg-amber-50 text-amber-600'
                      : 'border-gray-200 text-gray-400 hover:border-amber-200'
                  }`}>
                  {EMOTIONAL_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">感情キーワード</label>
            <div className="flex gap-2 mb-2">
              <input className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-amber-400 transition"
                value={kwInput} onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { onAddKeyword(kwInput); setKwInput('') } }}
                placeholder="喜び、希望..." />
              <button onClick={() => { onAddKeyword(kwInput); setKwInput('') }}
                className="bg-amber-50 border border-amber-200 text-amber-600 px-2.5 rounded-lg text-xs hover:bg-amber-100 transition-colors">追加</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {scene.emotionKeywords.map(k => (
                <span key={k} className="flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-100 text-xs px-2 py-0.5 rounded-full">
                  {k}
                  <button onClick={() => onUpdate('emotionKeywords', scene.emotionKeywords.filter(x => x !== k))}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
