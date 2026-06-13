import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects, persons } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createProjectSchema = z.object({
  title: z.string().min(1),
  person: z.object({
    fullName: z.string().min(1),
    birthYear: z.number().optional(),
    birthPlace: z.string().optional(),
    currentResidence: z.string().optional(),
    occupation: z.string().optional(),
    familyStructure: z.string().optional(),
    personalityNotes: z.string().optional(),
    specialKeywords: z.array(z.string()).optional(),
  }),
  videoStyleId: z.string().uuid().optional(),
})

export async function GET() {
  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      createdAt: projects.createdAt,
      personName: persons.fullName,
    })
    .from(projects)
    .innerJoin(persons, eq(projects.personId, persons.id))
    .orderBy(projects.createdAt)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { title, person, videoStyleId } = parsed.data

  const [newPerson] = await db.insert(persons).values(person).returning()
  const [newProject] = await db
    .insert(projects)
    .values({ title, personId: newPerson.id, videoStyleId })
    .returning()

  return NextResponse.json({ project: newProject, person: newPerson }, { status: 201 })
}
