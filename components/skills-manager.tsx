"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, BookOpen, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface Skill {
  id: string
  name: string
  description: string | null
  categories: {
    id: string
    name: string
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
}

interface SkillsManagerProps {
  userSkills: UserSkill[]
  allSkills: Skill[]
  categories: Category[]
  userId: string
}

export function SkillsManager({ userSkills, allSkills, categories, userId }: SkillsManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedSkill, setSelectedSkill] = useState<string>("")
  const [newSkillData, setNewSkillData] = useState({
    level: "beginner" as const,
    years_experience: 0,
    can_teach: false,
    wants_to_learn: true,
    description: "",
  })
  const router = useRouter()

  const filteredSkills = selectedCategory
    ? allSkills.filter((skill) => skill.categories?.id === selectedCategory)
    : allSkills

  const availableSkills = filteredSkills.filter(
    (skill) => !userSkills.some((userSkill) => userSkill.skill_id === skill.id),
  )

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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachingSkills.map((userSkill) => (
            <Card key={userSkill.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{userSkill.skills.name}</CardTitle>
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
                  <Badge variant="secondary">{userSkill.level}</Badge>
                  <Badge variant="outline">{userSkill.years_experience} years</Badge>
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {learningSkills.map((userSkill) => (
            <Card key={userSkill.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{userSkill.skills.name}</CardTitle>
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
                  <Badge variant="secondary">{userSkill.level}</Badge>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Skill</Label>
                    <Select value={selectedSkill} onValueChange={setSelectedSkill} disabled={!selectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSkills.map((skill) => (
                          <SelectItem key={skill.id} value={skill.id}>
                            {skill.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

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
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
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
                  <Button onClick={handleAddSkill} disabled={!selectedSkill || isLoading}>
                    {isLoading ? "Adding..." : "Add Skill"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
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
