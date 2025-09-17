import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { status } = await request.json()

    const { data, error } = await supabase
      .from("matches")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .or(`learner_id.eq.${user.id},teacher_id.eq.${user.id}`)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ match: data })
  } catch (error) {
    console.error("Update match error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
