import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SkillRequestForm } from "@/components/skill-request-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function RequestSkillPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get all skills and categories for the form
  const { data: skills } = await supabase
    .from("skills")
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .order("name")

  const { data: categories } = await supabase.from("categories").select("*").order("name")

  // Get user's skills they can offer in exchange
  const { data: userSkills } = await supabase
    .from("user_skills")
    .select(`
      *,
      skills (
        id,
        name
      )
    `)
    .eq("user_id", data.user.id)
    .eq("can_teach", true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Request a Skill</h1>
          <p className="text-xl text-gray-600 mb-2">Let the community know what you'd like to learn</p>
          <p className="text-gray-500">Connect with expert teachers and start your learning journey</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">24h</div>
            <div className="text-sm text-gray-600">Average Response Time</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">95%</div>
            <div className="text-sm text-gray-600">Match Success Rate</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">Free</div>
            <div className="text-sm text-gray-600">Skill Exchange Option</div>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Learning Request</CardTitle>
            <p className="text-gray-600">Fill out the details below and we'll connect you with the perfect teacher</p>
          </CardHeader>
          <CardContent>
            <SkillRequestForm
              skills={skills || []}
              categories={categories || []}
              userSkills={userSkills || []}
              userId={data.user.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
