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

    const { reviewee_id, rating, text, match_id } = await request.json()

    if (!reviewee_id || !rating) {
      return NextResponse.json({ error: "Reviewee ID and rating are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        reviewer_id: user.id,
        reviewee_id,
        rating,
        comment: text,
        match_id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ review: data })
  } catch (error) {
    console.error("Create review error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
