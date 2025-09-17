import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserProfile } from "@/components/user-profile"

export default async function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (profileError || !profile) {
    redirect("/dashboard")
  }

  // Get user's skills
  const { data: userSkills } = await supabase
    .from("user_skills")
    .select(`
      *,
      skills (
        id,
        name,
        categories (
          id,
          name
        )
      )
    `)
    .eq("user_id", userId)

  // Get user's reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey (
        id,
        full_name
      ),
      skills (
        id,
        name
      )
    `)
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <UserProfile
        profile={profile}
        userSkills={userSkills || []}
        reviews={reviews || []}
        isOwnProfile={data.user.id === userId}
      />
    </div>
  )
}
