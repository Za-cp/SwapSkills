import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatInterface } from "@/components/chat-interface"

export default async function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
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
        full_name,
        avatar_url
      ),
      learner_profile:profiles!matches_learner_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq("id", matchId)
    .single()

  if (matchError || !match) {
    redirect("/matches")
  }

  // Verify user is part of this match
  if (match.teacher_id !== data.user.id && match.learner_id !== data.user.id) {
    redirect("/matches")
  }

  // Get existing messages
  const { data: messages } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })

  const otherUser = match.teacher_id === data.user.id ? match.learner_profile : match.teacher_profile

  return (
    <div className="h-screen bg-gray-50">
      <ChatInterface match={match} messages={messages || []} currentUserId={data.user.id} otherUser={otherUser} />
    </div>
  )
}
