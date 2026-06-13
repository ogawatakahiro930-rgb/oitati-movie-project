// SQLiteはarrayをtext(JSON)で保存するため、
// APIレイヤーでパースした後の型を定義する

export type ParsedPerson = {
  id: string
  fullName: string
  birthYear: number | null
  birthPlace: string | null
  occupation: string | null
  familyStructure: string | null
  personalityNotes: string | null
  specialKeywords: string[]
  createdAt: string | null
}

export type ParsedScene = {
  id: string
  projectId: string
  orderIndex: number
  title: string
  ageAtScene: number | null
  yearAtScene: number | null
  location: string | null
  eventSummary: string
  emotionKeywords: string[]
  directionIntent: string | null
  emotionalStage: string | null
  emotionalArcNote: string | null
  innerMonologue: string | null
  createdAt: string | null
}
