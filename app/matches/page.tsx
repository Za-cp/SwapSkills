import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MatchesList } from "@/components/matches-list"

export default async function MatchesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user's matches as both learner and teacher
  const { data: learnerMatches } = await supabase
    .from("matches")
    .select(`
      *,
      skill_requests (
        id,
        title,
        description,
        skill_level_needed,
        skills (
          id,
          name
        )
      ),
      teacher_profile:profiles!matches_teacher_id_fkey (
        id,
        full_name,
        location_text,
        rating,
        total_reviews
      )
    `)
    .eq("learner_id", data.user.id)
    .order("created_at", { ascending: false })

  const { data: teacherMatches } = await supabase
    .from("matches")
    .select(`
      *,
      skill_requests (
        id,
        title,
        description,
        skill_level_needed,
        skills (
          id,
          name
        )
      ),
      learner_profile:profiles!matches_learner_id_fkey (
        id,
        full_name,
        location_text,
        rating,
        total_reviews
      )
    `)
    .eq("teacher_id", data.user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Matches</h1>
          <p className="text-gray-600 mt-2">Manage your learning and teaching connections</p>
        </div>

        <MatchesList
          learnerMatches={learnerMatches || []}
          teacherMatches={teacherMatches || []}
          currentUserId={data.user.id}
        />
      </div>
    </div>
  )
}
