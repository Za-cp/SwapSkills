"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, User, Sparkles, ArrowRight, ArrowLeft } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

const SKILL_CATEGORIES = [
  {
    id: "technology",
    name: "Technology",
    color: "bg-blue-500",
    skills: ["Web Development", "Mobile Apps", "Data Science", "AI/ML", "Cybersecurity"],
  },
  {
    id: "creative",
    name: "Creative",
    color: "bg-purple-500",
    skills: ["Graphic Design", "Photography", "Video Editing", "Writing", "Music Production"],
  },
  {
    id: "business",
    name: "Business",
    color: "bg-green-500",
    skills: ["Marketing", "Sales", "Finance", "Project Management", "Entrepreneurship"],
  },
  {
    id: "languages",
    name: "Languages",
    color: "bg-orange-500",
    skills: ["English", "Spanish", "French", "German", "Mandarin"],
  },
  {
    id: "fitness",
    name: "Fitness",
    color: "bg-red-500",
    skills: ["Personal Training", "Yoga", "Nutrition", "Sports Coaching", "Dance"],
  },
]

const AVAILABILITY_SLOTS = [
  "Monday Morning",
  "Monday Afternoon",
  "Monday Evening",
  "Tuesday Morning",
  "Tuesday Afternoon",
  "Tuesday Evening",
  "Wednesday Morning",
  "Wednesday Afternoon",
  "Wednesday Evening",
  "Thursday Morning",
  "Thursday Afternoon",
  "Thursday Evening",
  "Friday Morning",
  "Friday Afternoon",
  "Friday Evening",
  "Saturday Morning",
  "Saturday Afternoon",
  "Saturday Evening",
  "Sunday Morning",
  "Sunday Afternoon",
  "Sunday Evening",
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Form data
  const [profile, setProfile] = useState({
    bio: "",
    location: "",
    radius: 10,
    online_sessions: true,
    in_person_sessions: true,
  })

  const [selectedSkillsToTeach, setSelectedSkillsToTeach] = useState<string[]>([])
  const [selectedSkillsToLearn, setSelectedSkillsToLearn] = useState<string[]>([])
  const [availability, setAvailability] = useState<string[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const handleSkillToggle = (skill: string, type: "teach" | "learn") => {
    if (type === "teach") {
      setSelectedSkillsToTeach((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
    } else {
      setSelectedSkillsToLearn((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
    }
  }

  const handleAvailabilityToggle = (slot: string) => {
    setAvailability((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]))
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Update profile
      await supabase
        .from("profiles")
        .update({
          ...profile,
          availability: availability,
          onboarding_completed: true,
        })
        .eq("id", user.id)

      // Add skills to teach
      for (const skill of selectedSkillsToTeach) {
        await supabase.from("user_skills").insert({
          user_id: user.id,
          skill_name: skill,
          skill_type: "teaching",
          experience_level: "intermediate",
        })
      }

      // Add skills to learn
      for (const skill of selectedSkillsToLearn) {
        await supabase.from("user_skills").insert({
          user_id: user.id,
          skill_name: skill,
          skill_type: "learning",
          experience_level: "beginner",
        })
      }

      router.push("/discover")
    } catch (error) {
      console.error("Error completing onboarding:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Progress Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Welcome to SkillSwap</h1>
          </div>
          <p className="text-muted-foreground">Let's set up your profile to find the perfect skill matches</p>

          {/* Progress Bar */}
          <div className="flex items-center justify-center space-x-2 mt-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-12 h-1 mx-2 rounded transition-colors ${
                      step < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur">
          <CardContent className="p-8">
            {/* Step 1: Profile Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <User className="h-12 w-12 text-primary mx-auto mb-3" />
                  <CardTitle className="text-2xl">Tell us about yourself</CardTitle>
                  <CardDescription>Help others get to know you better</CardDescription>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about your interests, experience, and what you're passionate about..."
                      value={profile.bio}
                      onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="City, Country"
                        value={profile.location}
                        onChange={(e) => setProfile((prev) => ({ ...prev, location: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="radius">Search Radius (km)</Label>
                      <Select
                        value={profile.radius.toString()}
                        onValueChange={(value) => setProfile((prev) => ({ ...prev, radius: Number.parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 km</SelectItem>
                          <SelectItem value="10">10 km</SelectItem>
                          <SelectItem value="25">25 km</SelectItem>
                          <SelectItem value="50">50 km</SelectItem>
                          <SelectItem value="100">100 km</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Session Preferences</Label>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="online"
                          checked={profile.online_sessions}
                          onCheckedChange={(checked) => setProfile((prev) => ({ ...prev, online_sessions: !!checked }))}
                        />
                        <Label htmlFor="online">Online sessions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="in-person"
                          checked={profile.in_person_sessions}
                          onCheckedChange={(checked) =>
                            setProfile((prev) => ({ ...prev, in_person_sessions: !!checked }))
                          }
                        />
                        <Label htmlFor="in-person">In-person sessions</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Skills to Teach */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Sparkles className="h-12 w-12 text-primary mx-auto mb-3" />
                  <CardTitle className="text-2xl">What can you teach?</CardTitle>
                  <CardDescription>Select skills you'd like to share with others</CardDescription>
                </div>

                <div className="space-y-6">
                  {SKILL_CATEGORIES.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${category.color}`} />
                        <h3 className="font-semibold">{category.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {category.skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant={selectedSkillsToTeach.includes(skill) ? "default" : "outline"}
                            className={`cursor-pointer transition-all hover:scale-105 ${
                              selectedSkillsToTeach.includes(skill)
                                ? `${category.color} text-white hover:opacity-80`
                                : "hover:bg-muted"
                            }`}
                            onClick={() => handleSkillToggle(skill, "teach")}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Selected {selectedSkillsToTeach.length} skills to teach
                </div>
              </div>
            )}

            {/* Step 3: Skills to Learn */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <User className="h-12 w-12 text-primary mx-auto mb-3" />
                  <CardTitle className="text-2xl">What do you want to learn?</CardTitle>
                  <CardDescription>Select skills you'd like to develop</CardDescription>
                </div>

                <div className="space-y-6">
                  {SKILL_CATEGORIES.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${category.color}`} />
                        <h3 className="font-semibold">{category.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {category.skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant={selectedSkillsToLearn.includes(skill) ? "default" : "outline"}
                            className={`cursor-pointer transition-all hover:scale-105 ${
                              selectedSkillsToLearn.includes(skill)
                                ? `${category.color} text-white hover:opacity-80`
                                : "hover:bg-muted"
                            }`}
                            onClick={() => handleSkillToggle(skill, "learn")}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Selected {selectedSkillsToLearn.length} skills to learn
                </div>
              </div>
            )}

            {/* Step 4: Availability */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Clock className="h-12 w-12 text-primary mx-auto mb-3" />
                  <CardTitle className="text-2xl">When are you available?</CardTitle>
                  <CardDescription>Select your preferred time slots for skill sessions</CardDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {AVAILABILITY_SLOTS.map((slot) => (
                    <div
                      key={slot}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                        availability.includes(slot)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-muted border-border"
                      }`}
                      onClick={() => handleAvailabilityToggle(slot)}
                    >
                      <div className="text-sm font-medium">{slot}</div>
                    </div>
                  ))}
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Selected {availability.length} time slots
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                >
                  <span>{loading ? "Setting up..." : "Complete Setup"}</span>
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
