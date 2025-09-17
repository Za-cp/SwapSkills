import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ReviewForm } from "@/components/review-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ReviewPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get match details and verify user is part of this match
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`
      *,
      skill_requests (
        id,
        title,
        skills (
          id,
          name
        )
      ),
      teacher_profile:profiles!matches_teacher_id_fkey (
        id,
        full_name
      ),
      learner_profile:profiles!matches_learner_id_fkey (
        id,
        full_name
      )
    `)
    .eq("id", matchId)
    .single()

  if (matchError || !match) {
    redirect("/matches")
  }

  // Verify user is part of this match and it's completed
  if (match.teacher_id !== data.user.id && match.learner_id !== data.user.id) {
    redirect("/matches")
  }

  if (match.status !== "completed") {
    redirect("/matches")
  }

  // Check if user has already reviewed
  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("match_id", matchId)
    .eq("reviewer_id", data.user.id)
    .single()

  if (existingReview) {
    redirect("/matches")
  }

  const otherUser = match.teacher_id === data.user.id ? match.learner_profile : match.teacher_profile
  const isTeacher = match.teacher_id === data.user.id

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leave a Review</h1>
          <p className="text-gray-600 mt-2">Share your experience with {otherUser?.full_name || "your match"}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Review for {isTeacher ? "Learning" : "Teaching"} {match.skill_requests.skills.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewForm
              matchId={matchId}
              revieweeId={match.teacher_id === data.user.id ? match.learner_id : match.teacher_id}
              revieweeName={otherUser?.full_name || "Anonymous"}
              skillId={match.skill_requests.skills.id}
              skillName={match.skill_requests.skills.name}
              currentUserId={data.user.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
