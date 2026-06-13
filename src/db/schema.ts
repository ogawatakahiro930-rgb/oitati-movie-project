import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ============================================================
// persons: 主人公
// ============================================================
export const persons = pgTable('persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  birthYear: integer('birth_year'),
  birthPlace: text('birth_place'),
  currentResidence: text('current_residence'),
  occupation: text('occupation'),
  familyStructure: text('family_structure'),
  personalityNotes: text('personality_notes'),
  specialKeywords: text('special_keywords').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ============================================================
// video_styles: 動画の方向性
// ============================================================
export const videoStyles = pgTable('video_styles', {
  id: uuid('id').primaryKey().defaultRandom(),
  styleKey: text('style_key').unique().notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  colorPalette: jsonb('color_palette'),
  musicMood: text('music_mood'),
  pacing: text('pacing'),
  visualTone: text('visual_tone'),
})

// ============================================================
// projects: 案件管理の中心
// ============================================================
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  personId: uuid('person_id').notNull().references(() => persons.id),
  videoStyleId: uuid('video_style_id').references(() => videoStyles.id),
  status: text('status').notNull().default('draft'),
  operatorNotes: text('operator_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ============================================================
// story_scenes: 8つの人生シーン
// ============================================================
export const storyScenes = pgTable('story_scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  sceneKey: text('scene_key'),
  title: text('title').notNull(),
  ageAtScene: integer('age_at_scene'),
  yearAtScene: integer('year_at_scene'),
  location: text('location'),
  eventSummary: text('event_summary').notNull(),
  emotionKeywords: text('emotion_keywords').array(),
  directionIntent: text('direction_intent'),
  emotionalStage: text('emotional_stage'), // 'hope' | 'challenge' | 'effort' | 'turning_point' | 'success' | 'legacy' | 'message'
  emotionalArcNote: text('emotional_arc_note'),
  innerMonologue: text('inner_monologue'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ============================================================
// media: アップロード素材
// ============================================================
export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull(), // 'person_reference' | 'family_photo' | 'location_photo' | 'memory_photo' | 'generated_image'
  agePeriod: text('age_period'), // 'infant' | 'child' | 'teen' | 'young' | 'adult' | 'middle' | 'senior'
  filePath: text('file_path').notNull(),
  fileUrl: text('file_url'),
  sceneId: uuid('scene_id').references(() => storyScenes.id),
  aiAnalysis: jsonb('ai_analysis'), // Claude Visionによる顔特徴分析
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ============================================================
// character_bibles: 同一人物性の核心 ★最重要
// ============================================================
export const characterBibles = pgTable('character_bibles', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').unique().notNull().references(() => projects.id),

  // 固定特徴（全年齢共通）
  faceCoreFeatures: text('face_core_features').notNull(),
  bodyType: text('body_type'),
  distinctiveMarks: text('distinctive_marks'), // ほくろ・えくぼ等

  // 雰囲気・印象
  overallAtmosphere: text('overall_atmosphere'),
  personalityVisuals: text('personality_visuals'),

  // 年齢別外見変化マトリクス
  // { infant: { hair, face, style }, child: {...}, teen, young, adult, middle, senior }
  ageProgression: jsonb('age_progression').notNull(),

  // 年齢別精神状態マトリクス（追加）
  // { infant: { posture, gait, eyeExpression, mentalState, spiritualAura }, ... }
  lifeStageStates: jsonb('life_stage_states').notNull(),

  // プロンプト注入用テキスト（Consistency Anchor）★全プロンプトの先頭に入る
  consistencyAnchor: text('consistency_anchor').notNull(),

  modelReferenceUrl: text('model_reference_url'),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  reviewed: boolean('reviewed').default(false).notNull(),
})

// ============================================================
// scene_bibles: シーンごとの映像設計
// ============================================================
export const sceneBibles = pgTable('scene_bibles', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  sceneId: uuid('scene_id').unique().notNull().references(() => storyScenes.id),

  visualDirection: text('visual_direction'),
  cameraMovement: text('camera_movement'),
  lightingMood: text('lighting_mood'),
  colorGrading: text('color_grading'),
  backgroundDetail: text('background_detail'),
  wardrobeNotes: text('wardrobe_notes'),
  timeOfDay: text('time_of_day'),
  season: text('season'),
  eraDetails: text('era_details'), // 時代考証

  generatedAt: timestamp('generated_at').defaultNow().notNull(),
})

// ============================================================
// transition_bibles: シーン間の連続性設計 ★新規追加
// ============================================================
export const transitionBibles = pgTable('transition_bibles', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  fromSceneId: uuid('from_scene_id').notNull().references(() => storyScenes.id),
  toSceneId: uuid('to_scene_id').notNull().references(() => storyScenes.id),

  // 人物変化
  agingDescription: text('aging_description'),  // 「顔に少し疲れが出てきた」
  postureChange: text('posture_change'),          // 「背筋が伸び重心が低くなった」
  gaitChange: text('gait_change'),                // 「小走りから力強い歩みへ」

  // 背景・時代変化
  backgroundShift: text('background_shift'),
  eraShift: text('era_shift'),                    // 「昭和40年代 → 昭和60年代」
  eraVisualCues: text('era_visual_cues').array(), // ['スーツ姿', 'ネオン']

  // 感情変化
  emotionFrom: text('emotion_from'),
  emotionTo: text('emotion_to'),
  emotionalArc: text('emotional_arc'),            // 「無邪気さが責任感に変わる瞬間」

  // 映像演出
  transitionStyle: text('transition_style'),      // 「ディゾルブ」「モーフィング」
  durationNote: text('duration_note'),

  generatedAt: timestamp('generated_at').defaultNow().notNull(),
})

// ============================================================
// generated_prompts: 生成プロンプト
// ============================================================
export const generatedPrompts = pgTable('generated_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  sceneId: uuid('scene_id').references(() => storyScenes.id),
  promptType: text('prompt_type').notNull(), // 'image_generation' | 'video_generation' | 'narration' | 'caption'
  targetModel: text('target_model'),          // 'flux' | 'midjourney' | 'runway' | 'kling'
  promptContent: text('prompt_content').notNull(),
  negativePrompt: text('negative_prompt'),
  version: integer('version').default(1).notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  operatorEdit: text('operator_edit'),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
})

// ============================================================
// narration_scripts: ナレーション原稿
// ============================================================
export const narrationScripts = pgTable('narration_scripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  sceneId: uuid('scene_id').references(() => storyScenes.id),
  textContent: text('text_content').notNull(),
  estimatedSec: integer('estimated_sec'),
  emotionTone: text('emotion_tone'),
  version: integer('version').default(1).notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
})

// ============================================================
// generated_videos: 完成動画 (Ver4で主に使用)
// ============================================================
export const generatedVideos = pgTable('generated_videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  videoType: text('video_type').default('final'),
  status: text('status').default('pending').notNull(),
  filePath: text('file_path'),
  durationSec: integer('duration_sec'),
  generationMeta: jsonb('generation_meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 型エクスポート
export type Person = typeof persons.$inferSelect
export type NewPerson = typeof persons.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type StoryScene = typeof storyScenes.$inferSelect
export type NewStoryScene = typeof storyScenes.$inferInsert
export type Media = typeof media.$inferSelect
export type CharacterBible = typeof characterBibles.$inferSelect
export type SceneBible = typeof sceneBibles.$inferSelect
export type TransitionBible = typeof transitionBibles.$inferSelect
export type GeneratedPrompt = typeof generatedPrompts.$inferSelect
export type NarrationScript = typeof narrationScripts.$inferSelect
