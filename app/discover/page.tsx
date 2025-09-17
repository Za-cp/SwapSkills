"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  MapPin,
  Star,
  Users,
  Filter,
  Grid3X3,
  List,
  Heart,
  MessageCircle,
  Verified,
  Clock,
  Globe,
  User,
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface UserProfile {
  id: string
  full_name: string
  bio: string
  location: string
  avatar_url?: string
  rating: number
  total_reviews: number
  response_time: string
  online_sessions: boolean
  in_person_sessions: boolean
  verified: boolean
  skills_teaching: Array<{
    skill_name: string
    experience_level: string
    category: string
  }>
  skills_learning: Array<{
    skill_name: string
    experience_level: string
    category: string
  }>
  match_score?: number
  distance?: number
}

const SKILL_CATEGORIES = [
  "All Categories",
  "Technology",
  "Creative",
  "Business",
  "Languages",
  "Fitness",
  "Music",
  "Cooking",
  "Crafts",
  "Academic",
]

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [distanceRange, setDistanceRange] = useState([50])
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [inPersonOnly, setInPersonOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchProfiles()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [profiles, searchQuery, selectedCategory, distanceRange, onlineOnly, inPersonOnly, verifiedOnly, minRating])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_skills!inner (
            skill_name,
            experience_level,
            skill_type,
            category
          )
        `)
        .eq("user_skills.skill_type", "teaching")
        .limit(50)

      if (error) throw error

      // Group skills by user and calculate match scores
      const profilesMap = new Map()

      data?.forEach((row: any) => {
        if (!profilesMap.has(row.id)) {
          profilesMap.set(row.id, {
            ...row,
            skills_teaching: [],
            skills_learning: [],
            match_score: Math.floor(Math.random() * 40) + 60, // Mock match score
            distance: Math.floor(Math.random() * 30) + 1, // Mock distance
          })
        }

        const profile = profilesMap.get(row.id)
        if (row.user_skills) {
          profile.skills_teaching.push({
            skill_name: row.user_skills.skill_name,
            experience_level: row.user_skills.experience_level,
            category: row.user_skills.category || "Other",
          })
        }
      })

      setProfiles(Array.from(profilesMap.values()))
    } catch (error) {
      console.error("Error fetching profiles:", error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...profiles]

    // Search query
    if (searchQuery) {
      filtered = filtered.filter(
        (profile) =>
          profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          profile.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          profile.skills_teaching.some((skill) => skill.skill_name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Category filter
    if (selectedCategory !== "All Categories") {
      filtered = filtered.filter((profile) =>
        profile.skills_teaching.some((skill) => skill.category === selectedCategory),
      )
    }

    // Distance filter
    filtered = filtered.filter((profile) => (profile.distance || 0) <= distanceRange[0])

    // Session type filters
    if (onlineOnly) {
      filtered = filtered.filter((profile) => profile.online_sessions)
    }
    if (inPersonOnly) {
      filtered = filtered.filter((profile) => profile.in_person_sessions)
    }

    // Verified filter
    if (verifiedOnly) {
      filtered = filtered.filter((profile) => profile.verified)
    }

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter((profile) => (profile.rating || 0) >= minRating)
    }

    // Sort by match score
    filtered.sort((a, b) => (b.match_score || 0) - (a.match_score || 0))

    setFilteredProfiles(filtered)
  }

  const handleRequestSwap = async (profileId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Create a skill request/match
      await supabase.from("matches").insert({
        requester_id: user.id,
        teacher_id: profileId,
        status: "pending",
        created_at: new Date().toISOString(),
      })

      // Show success message
      alert("Swap request sent!")
    } catch (error) {
      console.error("Error sending request:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Discovering amazing teachers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Discover Skills</h1>
          <p className="text-muted-foreground text-lg">Find amazing teachers and start learning something new</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80 space-y-6">
            <Card className="shadow-lg border-0 bg-card/50 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search skills or teachers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Distance */}
                <div>
                  <Label>Distance: {distanceRange[0]} km</Label>
                  <Slider
                    value={distanceRange}
                    onValueChange={setDistanceRange}
                    max={100}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <Separator />

                {/* Session Type */}
                <div className="space-y-3">
                  <Label>Session Type</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="online" checked={onlineOnly} onCheckedChange={setOnlineOnly} />
                      <Label htmlFor="online" className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>Online only</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="in-person" checked={inPersonOnly} onCheckedChange={setInPersonOnly} />
                      <Label htmlFor="in-person" className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>In-person only</span>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Verified Teachers */}
                <div className="flex items-center space-x-2">
                  <Switch id="verified" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                  <Label htmlFor="verified" className="flex items-center space-x-2">
                    <Verified className="h-4 w-4" />
                    <span>Verified teachers only</span>
                  </Label>
                </div>

                {/* Minimum Rating */}
                <div>
                  <Label>Minimum Rating</Label>
                  <Select value={minRating.toString()} onValueChange={(value) => setMinRating(Number.parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any rating</SelectItem>
                      <SelectItem value="3">3+ stars</SelectItem>
                      <SelectItem value="4">4+ stars</SelectItem>
                      <SelectItem value="5">5 stars only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold">{filteredProfiles.length} teachers found</h2>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Users className="h-3 w-3 mr-1" />
                  {filteredProfiles.length} matches
                </Badge>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Results Grid/List */}
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredProfiles.map((profile) => (
                <Card
                  key={profile.id}
                  className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-card/50 backdrop-blur overflow-hidden"
                >
                  <CardContent className="p-6">
                    {/* Profile Header */}
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="relative">
                        <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                          <AvatarImage src={profile.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {profile.full_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        {profile.verified && (
                          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                            <Verified className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{profile.full_name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3" />
                          <span>{profile.location}</span>
                          <span>•</span>
                          <span>{profile.distance}km away</span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{profile.rating || 4.8}</span>
                            <span className="text-muted-foreground">({profile.total_reviews || 12})</span>
                          </div>
                          <div className="flex items-center space-x-1 text-green-600">
                            <Clock className="h-3 w-3" />
                            <span>{profile.response_time || "< 1h"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge
                          variant="secondary"
                          className="bg-gradient-to-r from-green-500/10 to-blue-500/10 text-green-600 border-green-500/20"
                        >
                          {profile.match_score}% match
                        </Badge>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {profile.bio || "Passionate about sharing knowledge and helping others learn new skills."}
                    </p>

                    {/* Skills */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-green-600">Teaching:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {profile.skills_teaching.slice(0, 3).map((skill, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs bg-green-500/10 text-green-600 border-green-500/20"
                          >
                            {skill.skill_name}
                          </Badge>
                        ))}
                        {profile.skills_teaching.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.skills_teaching.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Session Types */}
                    <div className="flex items-center space-x-4 mb-4 text-xs text-muted-foreground">
                      {profile.online_sessions && (
                        <div className="flex items-center space-x-1">
                          <Globe className="h-3 w-3" />
                          <span>Online</span>
                        </div>
                      )}
                      {profile.in_person_sessions && (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>In-person</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        onClick={() => handleRequestSwap(profile.id)}
                      >
                        Request Swap
                      </Button>
                      <Button variant="outline" size="sm" className="px-3 bg-transparent">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="px-3 bg-transparent">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProfiles.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No teachers found</h3>
                <p className="text-muted-foreground">Try adjusting your filters to see more results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
