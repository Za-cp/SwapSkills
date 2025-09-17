import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params

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

    const { action } = await request.json()

    let updates = {}
    if (action === "ban") {
      updates = { is_banned: true, banned_at: new Date().toISOString() }
    } else if (action === "unban") {
      updates = { is_banned: false, banned_at: null }
    } else if (action === "verify") {
      updates = { is_verified: true, verified_at: new Date().toISOString() }
    }

    const { data, error } = await supabase.from("profiles").update(updates).eq("id", id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ user: data })
  } catch (error) {
    console.error("Admin user action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
