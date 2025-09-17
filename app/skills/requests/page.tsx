import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SkillRequestsList } from "@/components/skill-requests-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function SkillRequestsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get all open skill requests with related data
  const { data: skillRequests } = await supabase
    .from("skill_requests")
    .select(`
      *,
      skills (
        id,
        name,
        categories (
          id,
          name
        )
      ),
      offered_skills:skills!skill_requests_offered_skill_id_fkey (
        id,
        name
      ),
      profiles (
        id,
        full_name,
        location_text,
        rating,
        total_reviews
      )
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Skill Requests</h1>
            <p className="text-gray-600 mt-2">Help others learn by responding to their requests</p>
          </div>
          <Button asChild>
            <Link href="/skills/request">
              <Plus className="w-4 h-4 mr-2" />
              Create Request
            </Link>
          </Button>
        </div>

        <SkillRequestsList skillRequests={skillRequests || []} currentUserId={data.user.id} />
      </div>
    </div>
  )
}
