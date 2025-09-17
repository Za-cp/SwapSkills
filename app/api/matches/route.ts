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

    const { requestId } = await request.json()

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 })
    }

    // Verify the request belongs to the user
    const { data: skillRequest, error: requestError } = await supabase
      .from("skill_requests")
      .select("*")
      .eq("id", requestId)
      .eq("requester_id", user.id)
      .single()

    if (requestError || !skillRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Find matches using the database function
    const { data: potentialMatches, error: matchError } = await supabase.rpc("find_matches_for_request", {
      request_id_param: requestId,
    })

    if (matchError) {
      console.error("Error finding matches:", matchError)
      return NextResponse.json({ error: "Failed to find matches" }, { status: 500 })
    }

    // Get detailed teacher information for the matches
    const teacherIds = potentialMatches?.map((match) => match.teacher_id) || []

    if (teacherIds.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    const { data: teachers, error: teachersError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        bio,
        location_text,
        rating,
        total_reviews
      `)
      .in("id", teacherIds)

    if (teachersError) {
      console.error("Error fetching teachers:", teachersError)
      return NextResponse.json({ error: "Failed to fetch teacher details" }, { status: 500 })
    }

    // Get teacher skills information
    const { data: teacherSkills, error: skillsError } = await supabase
      .from("user_skills")
      .select(`
        user_id,
        level,
        years_experience,
        description,
        skills (
          id,
          name
        )
      `)
      .in("user_id", teacherIds)
      .eq("skill_id", skillRequest.skill_id)
      .eq("can_teach", true)

    if (skillsError) {
      console.error("Error fetching teacher skills:", skillsError)
      return NextResponse.json({ error: "Failed to fetch teacher skills" }, { status: 500 })
    }

    // Combine the data
    const matches =
      potentialMatches?.map((match) => {
        const teacher = teachers?.find((t) => t.id === match.teacher_id)
        const teacherSkill = teacherSkills?.find((ts) => ts.user_id === match.teacher_id)

        return {
          ...match,
          teacher,
          teacherSkill,
        }
      }) || []

    // Create match records in the database
    const matchRecords = matches.map((match) => ({
      request_id: requestId,
      teacher_id: match.teacher_id,
      learner_id: user.id,
      skill_id: skillRequest.skill_id,
      compatibility_score: match.compatibility_score,
      distance_km: match.distance_km,
      status: "pending",
    }))

    // Insert matches (ignore conflicts for existing matches)
    const { error: insertError } = await supabase.from("matches").upsert(matchRecords, {
      onConflict: "request_id,teacher_id",
      ignoreDuplicates: true,
    })

    if (insertError) {
      console.error("Error creating match records:", insertError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ matches })
  } catch (error) {
    console.error("Error in matches API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
