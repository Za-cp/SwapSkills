"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, MapPin, Loader2, UserCheck, Clock } from "lucide-react"

interface Skill {
  id: string
  name: string
  description: string | null
  categories: {
    id: string
    name: string
  } | null
}

interface Category {
  id: string
  name: string
}

interface UserSkill {
  id: string
  skills: {
    id: string
    name: string
  }
}

interface SkillRequestFormProps {
  skills: Skill[]
  categories: Category[]
  userSkills: UserSkill[]
  userId: string
}

interface PotentialMatch {
  id: string
  name: string
  avatar_url: string | null
  rating: number
  distance: number
  experience_level: string
  hourly_rate: number | null
  response_time: string
}

export function SkillRequestForm({ skills, categories, userSkills, userId }: SkillRequestFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [isFindingMatches, setIsFindingMatches] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("none")
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [formData, setFormData] = useState({
    skill_id: "",
    title: "",
    description: "",
    skill_level_needed: "beginner" as const,
    offered_skill_id: "",
    location_text: "",
    latitude: null as number | null,
    longitude: null as number | null,
    max_distance_km: 25,
    is_remote: false,
    preferred_mode: "hybrid" as const,
    schedule_preference: "flexible" as const,
    duration_type: "ongoing" as const,
    budget_range: "",
    feature_request: false,
    group_learning: false,
    share_live_location: false,
  })
  const router = useRouter()

  useEffect(() => {
    if (formData.share_live_location && currentLocation) {
      const interval = setInterval(async () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }
            setCurrentLocation(newLocation)
            setFormData((prev) => ({
              ...prev,
              latitude: newLocation.lat,
              longitude: newLocation.lng,
            }))
          },
          (error) => console.error("Location update failed:", error),
        )
      }, 30000) // Update every 30 seconds

      return () => clearInterval(interval)
    }
  }, [formData.share_live_location, currentLocation])

  const filteredSkills =
    selectedCategory !== "none" ? skills.filter((skill) => skill.categories?.id === selectedCategory) : skills

  const skillSuggestions = useMemo(() => {
    if (formData.title.length < 2) return []
    return skills.filter((skill) => skill.name.toLowerCase().includes(formData.title.toLowerCase())).slice(0, 5)
  }, [formData.title, skills])

  const getCurrentLocation = () => {
    setIsLocationLoading(true)

    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Please enter your location manually",
        variant: "destructive",
      })
      setIsLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setCurrentLocation(location)
        setFormData((prev) => ({
          ...prev,
          latitude: location.lat,
          longitude: location.lng,
        }))

        // Reverse geocoding to get address
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.lat}&longitude=${location.lng}&localityLanguage=en`,
          )
          const data = await response.json()
          setFormData((prev) => ({
            ...prev,
            location_text: `${data.city}, ${data.countryName}`,
          }))
        } catch (error) {
          console.error("Reverse geocoding failed:", error)
        }

        setIsLocationLoading(false)
        toast({
          title: "Location detected!",
          description: "Your current location has been set",
        })
      },
      (error) => {
        console.error("Geolocation error:", error)
        toast({
          title: "Location access denied",
          description: "Please enter your location manually",
          variant: "destructive",
        })
        setIsLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  const findPerfectTeachers = async () => {
    if (!formData.skill_id || !formData.title) {
      toast({
        title: "Please fill required fields",
        description: "Select a skill and add a title first",
        variant: "destructive",
      })
      return
    }

    setIsFindingMatches(true)
    const supabase = createClient()

    try {
      // Find teachers with the requested skill
      const { data: teachers, error } = await supabase
        .from("user_skills")
        .select(`
          user_id,
          experience_level,
          hourly_rate,
          profiles!inner (
            id,
            name,
            avatar_url,
            rating,
            latitude,
            longitude,
            last_active
          ),
          skills!inner (
            id,
            name
          )
        `)
        .eq("skill_id", formData.skill_id)
        .eq("can_teach", true)
        .not("profiles.latitude", "is", null)
        .not("profiles.longitude", "is", null)

      if (error) throw error

      // Calculate distances and compatibility scores
      const matches: PotentialMatch[] =
        teachers?.map((teacher: any) => {
          let distance = 0
          if (currentLocation && teacher.profiles.latitude && teacher.profiles.longitude) {
            const R = 6371 // Earth's radius in km
            const dLat = ((teacher.profiles.latitude - currentLocation.lat) * Math.PI) / 180
            const dLon = ((teacher.profiles.longitude - currentLocation.lng) * Math.PI) / 180
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((currentLocation.lat * Math.PI) / 180) *
                Math.cos((teacher.profiles.latitude * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            distance = R * c
          }

          // Calculate response time based on last_active
          const lastActive = new Date(teacher.profiles.last_active || Date.now())
          const hoursAgo = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60)
          let responseTime = "Within 24h"
          if (hoursAgo < 1) responseTime = "Usually responds instantly"
          else if (hoursAgo < 6) responseTime = "Usually responds within 1h"
          else if (hoursAgo < 24) responseTime = "Usually responds within 6h"

          return {
            id: teacher.profiles.id,
            name: teacher.profiles.name,
            avatar_url: teacher.profiles.avatar_url,
            rating: teacher.profiles.rating || 4.5,
            distance: Math.round(distance * 10) / 10,
            experience_level: teacher.experience_level,
            hourly_rate: teacher.hourly_rate,
            response_time: responseTime,
          }
        }) || []

      // Sort by compatibility score (rating, distance, experience match)
      matches.sort((a, b) => {
        const scoreA =
          a.rating * 0.4 +
          (50 - Math.min(a.distance, 50)) * 0.3 +
          (a.experience_level === formData.skill_level_needed ? 30 : 0) * 0.3
        const scoreB =
          b.rating * 0.4 +
          (50 - Math.min(b.distance, 50)) * 0.3 +
          (b.experience_level === formData.skill_level_needed ? 30 : 0) * 0.3
        return scoreB - scoreA
      })

      setPotentialMatches(matches.slice(0, 5))
      setShowMatches(true)

      toast({
        title: "Perfect teachers found!",
        description: `Found ${matches.length} compatible teachers near you`,
      })
    } catch (error) {
      console.error("Error finding matches:", error)
      toast({
        title: "Error finding teachers",
        description: "Please try again or create your request",
        variant: "destructive",
      })
    } finally {
      setIsFindingMatches(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      const { error } = await supabase.from("skill_requests").insert({
        requester_id: userId,
        skill_id: formData.skill_id,
        title: formData.title,
        description: formData.description,
        skill_level_needed: formData.skill_level_needed,
        offered_skill_id: formData.offered_skill_id || null,
        location_text: formData.location_text,
        latitude: formData.latitude,
        longitude: formData.longitude,
        max_distance_km: formData.max_distance_km,
        is_remote: formData.is_remote,
        preferred_mode: formData.preferred_mode,
        schedule_preference: formData.schedule_preference,
        duration_type: formData.duration_type,
        budget_range: formData.budget_range,
        feature_request: formData.feature_request,
        group_learning: formData.group_learning,
        share_live_location: formData.share_live_location,
      })

      if (error) throw error

      toast({
        title: "Request created successfully!",
        description: "We're finding the perfect teachers for you. Check your matches soon!",
      })

      router.push("/matches")
    } catch (error) {
      console.error("Error creating request:", error)
      toast({
        title: "Error",
        description: "Failed to create request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-semibold">
          What would you like to learn?
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., JavaScript for beginners, Guitar lessons, Spanish conversation..."
          className="text-lg p-4"
          required
        />
        {skillSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-sm text-gray-600">Suggestions:</span>
            {skillSuggestions.map((skill) => (
              <Badge
                key={skill.id}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => {
                  setFormData({ ...formData, title: skill.name, skill_id: skill.id })
                  if (skill.categories) {
                    setSelectedCategory(skill.categories.id)
                  }
                }}
              >
                {skill.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="p-4">
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
          <Label className="text-base font-semibold">Specific Skill</Label>
          <Select
            value={formData.skill_id}
            onValueChange={(value) => setFormData({ ...formData, skill_id: value })}
            disabled={selectedCategory === "none"}
          >
            <SelectTrigger className="p-4">
              <SelectValue placeholder="Select a skill" />
            </SelectTrigger>
            <SelectContent>
              {filteredSkills.map((skill) => (
                <SelectItem key={skill.id} value={skill.id}>
                  {skill.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-semibold">
          Tell us more about your learning goals
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what you want to learn, your current level, specific goals, and any preferences you have..."
          rows={4}
          className="p-4"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Your Level</Label>
          <Select
            value={formData.skill_level_needed}
            onValueChange={(value: any) => setFormData({ ...formData, skill_level_needed: value })}
          >
            <SelectTrigger className="p-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Complete Beginner</SelectItem>
              <SelectItem value="intermediate">Some Experience</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="expert">Expert Level</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Preferred Mode</Label>
          <Select
            value={formData.preferred_mode}
            onValueChange={(value: any) => setFormData({ ...formData, preferred_mode: value })}
          >
            <SelectTrigger className="p-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online Only</SelectItem>
              <SelectItem value="in-person">In-Person Only</SelectItem>
              <SelectItem value="hybrid">Both Online & In-Person</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Duration</Label>
          <Select
            value={formData.duration_type}
            onValueChange={(value: any) => setFormData({ ...formData, duration_type: value })}
          >
            <SelectTrigger className="p-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-time">One-time Session</SelectItem>
              <SelectItem value="short-term">Few Sessions</SelectItem>
              <SelectItem value="ongoing">Ongoing Classes</SelectItem>
              <SelectItem value="intensive">Intensive Course</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-full">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Skill Exchange Option</h3>
              <p className="text-sm text-gray-600">Offer one of your skills in exchange for learning</p>
            </div>
          </div>
          <Select
            value={formData.offered_skill_id}
            onValueChange={(value) => setFormData({ ...formData, offered_skill_id: value })}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select a skill you can teach (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No skill exchange</SelectItem>
              {userSkills.map((userSkill) => (
                <SelectItem key={userSkill.id} value={userSkill.skills.id}>
                  I can teach {userSkill.skills.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Location & Visibility</h3>
              <p className="text-sm text-gray-600">Help teachers find you and connect locally</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="location_text" className="text-base font-semibold">
                Your Location
              </Label>
              <div className="flex gap-2">
                <Input
                  id="location_text"
                  value={formData.location_text}
                  onChange={(e) => setFormData({ ...formData, location_text: e.target.value })}
                  placeholder="City, Country"
                  className="p-4 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={isLocationLoading}
                  className="px-4 bg-transparent"
                >
                  {isLocationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </Button>
              </div>
              {currentLocation && <p className="text-xs text-green-600">✓ GPS location detected</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_distance_km" className="text-base font-semibold">
                Search Radius (km)
              </Label>
              <Input
                id="max_distance_km"
                type="number"
                min="1"
                max="500"
                value={formData.max_distance_km}
                onChange={(e) => setFormData({ ...formData, max_distance_km: Number.parseInt(e.target.value) || 25 })}
                className="p-4"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="share_live_location"
                checked={formData.share_live_location}
                onChange={(e) => setFormData({ ...formData, share_live_location: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="share_live_location" className="text-sm text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Share live location with matched teachers (updates every 30 seconds)
              </label>
            </div>
            {formData.share_live_location && (
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                🔒 Your location is only shared with teachers you match with and can be turned off anytime
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-full">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Find Perfect Teachers Now</h3>
              <p className="text-sm text-gray-600">Get instant matches based on your requirements</p>
            </div>
          </div>

          <Button
            type="button"
            onClick={findPerfectTeachers}
            disabled={isFindingMatches || !formData.skill_id || !formData.title}
            className="w-full bg-green-600 hover:bg-green-700 p-4 text-lg mb-4"
          >
            {isFindingMatches ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Finding Perfect Teachers...
              </>
            ) : (
              "🎯 Find My Perfect Teacher Now"
            )}
          </Button>

          {showMatches && potentialMatches.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Perfect Matches Found:</h4>
              {potentialMatches.map((match) => (
                <div
                  key={match.id}
                  className="bg-white p-4 rounded-lg border border-green-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{match.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <span>⭐ {match.rating}</span>
                        <span>📍 {match.distance}km away</span>
                        <span>💰 ${match.hourly_rate || "Free"}/hr</span>
                      </div>
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {match.response_time}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    Connect Now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4 pt-6">
        <Button
          type="submit"
          disabled={isLoading || !formData.skill_id || !formData.title || !formData.description}
          className="flex-1 bg-blue-600 hover:bg-blue-700 p-4 text-lg"
        >
          {isLoading ? "Creating Request..." : "Create Learning Request"}
        </Button>
        <Button type="button" variant="outline" className="px-8 bg-transparent">
          Save Draft
        </Button>
      </div>
    </form>
  )
}
