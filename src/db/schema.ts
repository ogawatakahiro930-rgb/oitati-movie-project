import {
  sqliteTable,
  text,
  integer,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const nowSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
const uuidDefault = sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`

// ============================================================
// persons: 主人公
// ============================================================
export const persons = sqliteTable('persons', {
  id: text('id').primaryKey().default(uuidDefault),
  fullName: text('full_name').notNull(),
  birthYear: integer('birth_year'),
  birthPlace: text('birth_place'),
  currentResidence: text('current_residence'),
  occupation: text('occupation'),
  familyStructure: text('family_structure'),
  personalityNotes: text('personality_notes'),
  specialKeywords: text('special_keywords'), // JSON string[]
  createdAt: text('created_at').default(nowSql),
})

// ============================================================
// video_styles: 動画の方向性
// ============================================================
export const videoStyles = sqliteTable('video_styles', {
  id: text('id').primaryKey().default(uuidDefault),
  styleKey: text('style_key').unique().notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  colorPalette: text('color_palette'), // JSON
  musicMood: text('music_mood'),
  pacing: text('pacing'),
  visualTone: text('visual_tone'),
})

// ============================================================
// projects: 案件管理の中心
// ============================================================
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().default(uuidDefault),
  title: text('title').notNull(),
  personId: text('person_id').notNull().references(() => persons.id),
  videoStyleId: text('video_style_id').references(() => videoStyles.id),
  status: text('status').notNull().default('draft'),
  operatorNotes: text('operator_notes'),
  createdAt: text('created_at').default(nowSql),
  updatedAt: text('updated_at').default(nowSql),
})

// ============================================================
// story_scenes: 8つの人生シーン
// ============================================================
export const storyScenes = sqliteTable('story_scenes', {
  id: text('id').primaryKey().default(uuidDefault),
  projectId: text('project_id').notNull().references(() => projects.id),
  orderIndex: integer('order_index').notNull(),
  sceneKey: text('scene_key'),
  title: text('title').notNull(),
  ageAtScene: integer('age_at_scene'),
  yearAtScene: integer('year_at_scene'),
  location: text('location'),
  eventSummary: text('event_summary').notNull(),
  emotionKeywords: text('emotion_keywords'), // JSON string[]
  directionIntent: text('direction_intent'),
  emotionalStage: text('emotional_stage'),
  emotionalArcNote: text('emotional_arc_note'),
  innerMonologue: text('inner_monologue'),
  createdAt: text('created_at').default(nowSql),
})

// ============================================================
// media: アップロード素材
// ============================================================
export const media = sqliteTable('media', {
  id: text('id').primaryKey().default(uuidDefault),
  projectId: text('project_id').notNull().references(() => projects.id),
  mediaType: text('media_type').notNull(),
  agePeriod: text('age_period'),
  filePath: text('file_path').notNull(),
  fileUrl: text('file_url'),
  sceneId: text('scene_id').references(() => storyScenes.id),
  aiAnalysis: text('ai_analysis'), // JSON
  createdAt: text('created_at').default(nowSql),
})

// ============================================================
// character_bibles: 同一人物性の核心 ★最重要
// ============================================================
export const characterBibles = sqliteTable('character_bibles', {
  id: text('id').primaryKey().default(uuidDefault),
  projectId: text('project_id').unique().notNull().references(() => projects.id),

  faceCoreFeatures: text('face_core_features').notNull(),
  bodyType: text('body_type'),
  distinctiveMarks: text('distinctive_marks'),
  overallAtmosphere: text('overall_atmosphere'),
  personalityVisuals: text('personality_visuals'),

  ageProgression: text('age_progression').notNull(),    // JSON
  lifeStageStates: text('life_stage_states').notNull(), // JSON

  // ★ 全プロンプトの先頭に注入するConsistency Anchor
  consistencyAnchor: text('consistency_anchor').notNull(),

  modelReferenceUrl: text('model_reference_url'),
  generatedAt: text('generated_at').default(nowSql),
  reviewed: integer('reviewed', { mode: 'boolean' }).default(false).notNull(),
})

// ============================================================
// scene_bibles: シーンごとの映像設計
// ============================================================
export const sceneBibles = sqliteTable('scene_bibles', {
  id: text('id').primaryKey().default(uuidDefault),
  projectId: text('project_id').notNull().references(() => projects.id),
  sceneId: text('scene_id').unique().notNull().references(() => storyScenes.id),

  visualDirection: text('visual_direction'),
  cameraMovement: text('camera_movement'),
  lightingMood: text('lighting_mood'),
  colorGrading: text('color_grading'),
  backgroundDetail: text('background_detail'),
  wardrobeNotes: text('wardrobe_notes'),
  timeOfDay: text('time_of_day'),
  season: text('season'),
  eraDetails: text('era_details'),

  generatedAt: text('generated_at').default(nowSql),
})

// ============================================================
// transition_bibles: シーン間の連続性設計 ★核心
// ============================================================
export const transitionBibles = sqliteTable('transition_bibles', {
  id: text('id').primaryKey().default(uuidDefault),
  projectId: text('project_id').notNull().references(() => projects.id),
  fromSceneId: text('from_scene_id').notNull().references(() => storyScenes.id),
  toSceneId: text('to_scene_id').notNull().references(() => storyScenes.id),

  agingDescription: text('aging_description'),
  postureChange: text('posture_change'),
  gaitChange: text('gait_change'),

  backgroundShift: text('background_shift'),
  eraShift: text('era_shift'),
  eraVisualCues: text('era_visual_cues'), // JSON string[]

  emotionFrom: text('emotion_from'),
  emotionTo: text('emotion_to'),
  emotionalArc: text('emotional_arc'),

  transitionStyle: text('transition_style'),
  durationNote: text('duration_note'),

  generatedAt: text('generated_at').default(nowSql),
})

// ============================================================
// generated_prompts: 生成プロンプト
// ============================================================
export const generatedPrompts = sqliteTable('generated_prompts', {
  id: text('id').primaryKey().default(uuidDefault),
  projectId: text('project_id').notNull().references(() => projects.id),
  sceneId: text('scene_id').references(() => storyScenes.id),
  promptType: text('prompt_type').notNull(),
  targetModel: text('target_model'),
  promptContent: text('prompt_content').notNull(),
  negativePrompt: text('negative_prompt'),
  version: integer('version').default(1).notNull(),
  isApproved: integer('is_approved', { mode: 'boolean' }).default(false).notNull(),
  operatorEdit: text('operator_edit'),
  generatedAt: text('generated_at').default(nowSql),
})

// ============================================================
// narration_scripts: ナレーション原稿
// ============================================================
export const narrationScripts = sqliteTable('narration_scripts', {
  id: text('id').primaryKey().default(uuidDefault),
  projectId: text('project_id').notNull().references(() => projects.id),
  sceneId: text('scene_id').references(() => storyScenes.id),
  textContent: text('text_content').notNull(),
  estimatedSec: integer('estimated_sec'),
  emotionTone: text('emotion_tone'),
  version: integer('version').default(1).notNull(),
  isApproved: integer('is_approved', { mode: 'boolean' }).default(false).notNull(),
  generatedAt: text('generated_at').default(nowSql),
})

// ============================================================
// generated_videos: 完成動画 (Ver4)
// ============================================================
export const generatedVideos = sqliteTable('generated_videos', {
  id: text('id').primaryKey().default(uuidDefault),
  projectId: text('project_id').notNull().references(() => projects.id),
  sceneId: text('scene_id').references(() => storyScenes.id),
  klingTaskId: text('kling_task_id'),       // KlingタスクID
  klingPrompt: text('kling_prompt'),         // 使用したプロンプト
  videoUrl: text('video_url'),               // 完成動画URL
  status: text('status').default('pending').notNull(), // pending|processing|completed|failed
  errorMessage: text('error_message'),
  durationSec: integer('duration_sec'),
  aspectRatio: text('aspect_ratio').default('16:9'),
  createdAt: text('created_at').default(nowSql),
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
