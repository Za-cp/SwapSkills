import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EnhancedSkillsManager } from "@/components/enhanced-skills-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SkillsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user skills with skill and category information
  const { data: userSkills } = await supabase
    .from("user_skills")
    .select(`
      *,
      skills (
        id,
        name,
        description,
        is_custom,
        categories (
          id,
          name,
          icon,
          color_hex
        )
      )
    `)
    .eq("user_id", data.user.id)

  // Get all available skills and categories
  const { data: allSkills } = await supabase
    .from("skills")
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color_hex
      )
    `)
    .eq("is_approved", true)
    .order("name")

  const { data: categories } = await supabase.from("categories").select("*").order("sort_order", { ascending: true })

  const { data: skillSuggestions } = await supabase
    .from("skill_suggestions")
    .select(`
      skill_id,
      search_terms,
      popularity_score,
      skills (
        id,
        name,
        description
      )
    `)
    .order("popularity_score", { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Skills</h1>
          <p className="text-gray-600 mt-2">Manage the skills you can teach and want to learn</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Skills Management</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedSkillsManager
              userSkills={userSkills || []}
              allSkills={allSkills || []}
              categories={categories || []}
              skillSuggestions={skillSuggestions || []}
              userId={data.user.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
