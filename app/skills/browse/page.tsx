import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SkillsBrowser } from "@/components/skills-browser"

export default async function BrowseSkillsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get all available skills with teachers
  const { data: skillsWithTeachers } = await supabase
    .from("user_skills")
    .select(`
      *,
      skills (
        id,
        name,
        description,
        categories (
          id,
          name
        )
      ),
      profiles (
        id,
        full_name,
        location_text,
        rating,
        total_reviews
      )
    `)
    .eq("can_teach", true)
    .order("created_at", { ascending: false })

  // Get all categories for filtering
  const { data: categories } = await supabase.from("categories").select("*").order("name")

  const { data: userProfile } = await supabase.from("profiles").select("location_text").eq("id", data.user.id).single()

  const { data: trendingSkills } = await supabase
    .from("skill_requests")
    .select(`
      skill_id,
      skills (
        id,
        name
      )
    `)
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Browse Skills</h1>
          <p className="text-xl text-gray-600 mb-2">Discover new skills and connect with teachers in your area</p>
          <p className="text-gray-500">Join our community of learners and unlock your potential</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{skillsWithTeachers?.length || 0}</div>
            <div className="text-gray-600">Skills Available</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {new Set(skillsWithTeachers?.map((s) => s.profiles.id)).size || 0}
            </div>
            <div className="text-gray-600">Expert Teachers</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{categories?.length || 0}</div>
            <div className="text-gray-600">Categories</div>
          </div>
        </div>

        <SkillsBrowser
          skillsWithTeachers={skillsWithTeachers || []}
          categories={categories || []}
          userLocation={userProfile?.location_text}
          trendingSkills={trendingSkills || []}
        />
      </div>
    </div>
  )
}
