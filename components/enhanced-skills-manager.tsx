"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, BookOpen, Users, Search, Star, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface Skill {
  id: string
  name: string
  description: string | null
  is_custom: boolean
  categories: {
    id: string
    name: string
    icon: string
    color_hex: string
  } | null
}

interface UserSkill {
  id: string
  skill_id: string
  level: "beginner" | "intermediate" | "advanced" | "expert"
  years_experience: number
  can_teach: boolean
  wants_to_learn: boolean
  description: string | null
  skills: Skill
}

interface Category {
  id: string
  name: string
  icon: string
  color_hex: string
}

interface SkillSuggestion {
  skill_id: string
  search_terms: string[]
  popularity_score: number
  skills: {
    id: string
    name: string
    description: string | null
  }
}

interface EnhancedSkillsManagerProps {
  userSkills: UserSkill[]
  allSkills: Skill[]
  categories: Category[]
  skillSuggestions: SkillSuggestion[]
  userId: string
}

export function EnhancedSkillsManager({
  userSkills,
  allSkills,
  categories,
  skillSuggestions,
  userId,
}: EnhancedSkillsManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedSkill, setSelectedSkill] = useState<string>("")
  const [skillSearchTerm, setSkillSearchTerm] = useState("")
  const [showCustomSkillForm, setShowCustomSkillForm] = useState(false)
  const [customSkillName, setCustomSkillName] = useState("")
  const [newSkillData, setNewSkillData] = useState({
    level: "beginner" as const,
    years_experience: 0,
    can_teach: false,
    wants_to_learn: true,
    description: "",
  })
  const router = useRouter()

  const filteredSkills = useMemo(() => {
    let skills = selectedCategory ? allSkills.filter((skill) => skill.categories?.id === selectedCategory) : allSkills

    if (skillSearchTerm) {
      const searchLower = skillSearchTerm.toLowerCase()
      skills = skills.filter((skill) => {
        const matchesName = skill.name.toLowerCase().includes(searchLower)
        const matchesDescription = skill.description?.toLowerCase().includes(searchLower)
        const matchesCategory = skill.categories?.name.toLowerCase().includes(searchLower)

        // Check suggestion search terms
        const suggestion = skillSuggestions.find((s) => s.skill_id === skill.id)
        const matchesSuggestions = suggestion?.search_terms.some((term) => term.includes(searchLower))

        return matchesName || matchesDescription || matchesCategory || matchesSuggestions
      })

      // Sort by popularity and relevance
      skills.sort((a, b) => {
        const suggestionA = skillSuggestions.find((s) => s.skill_id === a.id)
        const suggestionB = skillSuggestions.find((s) => s.skill_id === b.id)
        const scoreA = suggestionA?.popularity_score || 0
        const scoreB = suggestionB?.popularity_score || 0
        return scoreB - scoreA
      })
    }

    return skills.filter((skill) => !userSkills.some((userSkill) => userSkill.skill_id === skill.id))
  }, [allSkills, selectedCategory, skillSearchTerm, skillSuggestions, userSkills])

  const handleSubmitCustomSkill = async () => {
    if (!customSkillName.trim() || !selectedCategory) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Insert custom skill for moderation
      const { data: customSkill, error: skillError } = await supabase
        .from("skills")
        .insert({
          name: customSkillName.trim(),
          description: `Custom skill submitted by user`,
          category_id: selectedCategory,
          is_custom: true,
          is_approved: false,
          submitted_by: userId,
        })
        .select()
        .single()

      if (skillError) throw skillError

      // Add to user's skills immediately (pending approval)
      const { error: userSkillError } = await supabase.from("user_skills").insert({
        user_id: userId,
        skill_id: customSkill.id,
        ...newSkillData,
      })

      if (userSkillError) throw userSkillError

      toast({
        title: "Custom skill submitted",
        description: "Your skill has been submitted for review and added to your profile.",
      })

      setCustomSkillName("")
      setShowCustomSkillForm(false)
      setShowAddForm(false)
      router.refresh()
    } catch (error) {
      console.error("Error submitting custom skill:", error)
      toast({
        title: "Error",
        description: "Failed to submit custom skill. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSkill = async () => {
    if (!selectedSkill) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("user_skills").insert({
        user_id: userId,
        skill_id: selectedSkill,
        ...newSkillData,
      })

      if (error) throw error

      toast({
        title: "Skill added",
        description: "The skill has been added to your profile.",
      })

      setShowAddForm(false)
      setSelectedSkill("")
      setSelectedCategory("")
      setSkillSearchTerm("")
      setNewSkillData({
        level: "beginner",
        years_experience: 0,
        can_teach: false,
        wants_to_learn: true,
        description: "",
      })
      router.refresh()
    } catch (error) {
      console.error("Error adding skill:", error)
      toast({
        title: "Error",
        description: "Failed to add skill. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveSkill = async (userSkillId: string) => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("user_skills").delete().eq("id", userSkillId)

      if (error) throw error

      toast({
        title: "Skill removed",
        description: "The skill has been removed from your profile.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error removing skill:", error)
      toast({
        title: "Error",
        description: "Failed to remove skill. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const teachingSkills = userSkills.filter((skill) => skill.can_teach)
  const learningSkills = userSkills.filter((skill) => skill.wants_to_learn)

  return (
    <div className="space-y-8">
      {/* Skills I Can Teach */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-green-600" />
          <h3 className="text-xl font-semibold text-gray-900">Skills I Can Teach</h3>
          <Badge variant="secondary">{teachingSkills.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachingSkills.map((userSkill) => (
            <Card key={userSkill.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {userSkill.skills.name}
                      {userSkill.skills.is_custom && (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{userSkill.skills.categories?.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSkill(userSkill.id)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" style={{ backgroundColor: userSkill.skills.categories?.color_hex + "20" }}>
                    {userSkill.level}
                  </Badge>
                  <Badge variant="outline">{userSkill.years_experience} years</Badge>
                  {userSkill.level === "expert" && (
                    <Badge className="bg-yellow-500 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Expert
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {userSkill.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600">{userSkill.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Skills I Want to Learn */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">Skills I Want to Learn</h3>
          <Badge variant="secondary">{learningSkills.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {learningSkills.map((userSkill) => (
            <Card key={userSkill.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {userSkill.skills.name}
                      {userSkill.skills.is_custom && (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{userSkill.skills.categories?.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSkill(userSkill.id)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" style={{ backgroundColor: userSkill.skills.categories?.color_hex + "20" }}>
                    {userSkill.level}
                  </Badge>
                </div>
              </CardHeader>
              {userSkill.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600">{userSkill.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Add New Skill */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Add New Skill</h3>
          <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Skill
          </Button>
        </div>

        {showAddForm && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                        className="justify-start"
                        style={{
                          backgroundColor: selectedCategory === category.id ? category.color_hex : "transparent",
                          borderColor: category.color_hex,
                          color: selectedCategory === category.id ? "white" : category.color_hex,
                        }}
                      >
                        <span className="mr-2">{category.icon}</span>
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Search Skills</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Type to search skills..."
                      value={skillSearchTerm}
                      onChange={(e) => setSkillSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Skill</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {filteredSkills.slice(0, 20).map((skill) => {
                      const suggestion = skillSuggestions.find((s) => s.skill_id === skill.id)
                      const isPopular = (suggestion?.popularity_score || 0) > 70

                      return (
                        <div
                          key={skill.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                            selectedSkill === skill.id ? "bg-blue-50 border-blue-200" : ""
                          }`}
                          onClick={() => setSelectedSkill(skill.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{skill.name}</span>
                                {isPopular && (
                                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                    Popular
                                  </Badge>
                                )}
                                {skill.is_custom && (
                                  <Badge variant="outline" className="text-xs">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                              {skill.description && <p className="text-sm text-gray-600 mt-1">{skill.description}</p>}
                            </div>
                            <Badge variant="outline" style={{ borderColor: skill.categories?.color_hex }}>
                              {skill.categories?.name}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomSkillForm(!showCustomSkillForm)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Don't see your skill? Add a custom one
                    </Button>
                  </div>
                </div>

                {showCustomSkillForm && (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Submit Custom Skill</span>
                        </div>
                        <Input
                          placeholder="Enter skill name..."
                          value={customSkillName}
                          onChange={(e) => setCustomSkillName(e.target.value)}
                        />
                        <p className="text-xs text-yellow-700">
                          Custom skills will be reviewed before appearing in search results.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSubmitCustomSkill}
                            disabled={!customSkillName.trim() || !selectedCategory}
                          >
                            Submit for Review
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowCustomSkillForm(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Your Level</Label>
                    <Select
                      value={newSkillData.level}
                      onValueChange={(value: any) => setNewSkillData({ ...newSkillData, level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">🌱 Beginner</SelectItem>
                        <SelectItem value="intermediate">🌿 Intermediate</SelectItem>
                        <SelectItem value="advanced">🌳 Advanced</SelectItem>
                        <SelectItem value="expert">⭐ Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newSkillData.years_experience}
                      onChange={(e) =>
                        setNewSkillData({ ...newSkillData, years_experience: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="can_teach"
                      checked={newSkillData.can_teach}
                      onChange={(e) => setNewSkillData({ ...newSkillData, can_teach: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="can_teach">I can teach this skill</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="wants_to_learn"
                      checked={newSkillData.wants_to_learn}
                      onChange={(e) => setNewSkillData({ ...newSkillData, wants_to_learn: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="wants_to_learn">I want to learn this skill</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={newSkillData.description}
                    onChange={(e) => setNewSkillData({ ...newSkillData, description: e.target.value })}
                    placeholder="Describe your experience or learning goals..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={showCustomSkillForm ? handleSubmitCustomSkill : handleAddSkill}
                    disabled={(!selectedSkill && !customSkillName.trim()) || isLoading}
                  >
                    {isLoading ? "Adding..." : showCustomSkillForm ? "Submit Custom Skill" : "Add Skill"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false)
                      setShowCustomSkillForm(false)
                      setCustomSkillName("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
