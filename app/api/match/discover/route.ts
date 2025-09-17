import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const lat = searchParams.get("lat")
    const lon = searchParams.get("lon")
    const radius = searchParams.get("radius") || "50"
    const q = searchParams.get("q") || ""

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: candidates, error } = await supabase.rpc("discover_skill_matches", {
      user_lat: Number.parseFloat(lat || "0"),
      user_lon: Number.parseFloat(lon || "0"),
      search_radius: Number.parseInt(radius),
      search_query: q,
      current_user_id: user.id,
    })

    if (error) {
      console.error("Discovery error:", error)
      return NextResponse.json({ error: "Failed to discover matches" }, { status: 500 })
    }

    return NextResponse.json({ candidates })
  } catch (error) {
    console.error("Match discovery error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
