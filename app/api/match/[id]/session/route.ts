import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { proposed_time, location, mode, notes } = await request.json()

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        match_id: id,
        proposed_by: user.id,
        proposed_time,
        location,
        mode,
        notes,
        status: "proposed",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    console.error("Session proposal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
