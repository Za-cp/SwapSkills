import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { to_user_id, message, skill_offered_id, skill_wanted_id } = await request.json()

    const { data, error } = await supabase
      .from("matches")
      .insert({
        learner_id: user.id,
        teacher_id: to_user_id,
        skill_id: skill_wanted_id,
        offered_skill_id: skill_offered_id,
        message,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ match: data })
  } catch (error) {
    console.error("Match request error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
