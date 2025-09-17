import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: reports, error } = await supabase
      .from("reports")
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey (
          id,
          full_name
        ),
        reported_user:profiles!reports_reported_user_id_fkey (
          id,
          full_name
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("Get reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
