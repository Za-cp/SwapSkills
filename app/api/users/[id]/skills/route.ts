import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params

    const { data: skills, error } = await supabase
      .from("user_skills")
      .select(`
        *,
        skills (
          id,
          name,
          category
        )
      `)
      .eq("user_id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ skills })
  } catch (error) {
    console.error("Get user skills error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user || user.id !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { skillId, canTeach, canLearn, level, yearsExperience, description } = await request.json()

    const { data, error } = await supabase
      .from("user_skills")
      .upsert({
        user_id: id,
        skill_id: skillId,
        can_teach: canTeach,
        can_learn: canLearn,
        level,
        years_experience: yearsExperience,
        description,
      })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ skill: data })
  } catch (error) {
    console.error("Add user skill error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
