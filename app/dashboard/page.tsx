import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  // Get user's skills counts
  const { data: teachingSkills } = await supabase
    .from("user_skills")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("can_teach", true)

  const { data: learningSkills } = await supabase
    .from("user_skills")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("wants_to_learn", true)

  // Get user's active requests
  const { data: activeRequests } = await supabase
    .from("skill_requests")
    .select("id")
    .eq("requester_id", data.user.id)
    .eq("status", "open")

  // Get active matches count
  const { data: activeMatches } = await supabase
    .from("matches")
    .select("id")
    .or(`teacher_id.eq.${data.user.id},learner_id.eq.${data.user.id}`)
    .eq("status", "accepted")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.full_name || data.user.email}!</h1>
          <p className="text-gray-600 mt-2">Ready to learn something new or share your skills?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">Browse Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Discover new skills and connect with teachers in your area.</p>
              <Button asChild className="w-full">
                <Link href="/skills/browse">Browse Skills</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Join community challenges and level up your skills with others!</p>
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <Link href="/challenges">Join Challenges</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">Your Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">View and manage your learning and teaching connections.</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/matches">View Matches</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">Skill Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">See what others want to learn and offer your help.</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/skills/requests">View Requests</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{teachingSkills?.length || 0}</div>
                  <div className="text-sm text-gray-600">Skills Teaching</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{learningSkills?.length || 0}</div>
                  <div className="text-sm text-gray-600">Skills Learning</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{activeRequests?.length || 0}</div>
                  <div className="text-sm text-gray-600">Active Requests</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{activeMatches?.length || 0}</div>
                  <div className="text-sm text-gray-600">Active Chats</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href="/skills/request">Create Skill Request</Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href="/skills/browse">Find a Teacher</Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href="/challenges">Join Challenges</Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href="/matches">View Your Matches</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
