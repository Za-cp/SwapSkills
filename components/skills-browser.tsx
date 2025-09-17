"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Star, User, Heart, Clock, TrendingUp, Award } from "lucide-react"
import Link from "next/link"

interface SkillWithTeacher {
  id: string
  level: string
  years_experience: number
  description: string | null
  skills: {
    id: string
    name: string
    description: string | null
    categories: {
      id: string
      name: string
    } | null
  }
  profiles: {
    id: string
    full_name: string | null
    location_text: string | null
    rating: number
    total_reviews: number
  }
}

interface Category {
  id: string
  name: string
}

interface TrendingSkill {
  skill_id: string
  skills: {
    id: string
    name: string
  }
}

interface SkillsBrowserProps {
  skillsWithTeachers: SkillWithTeacher[]
  categories: Category[]
  userLocation?: string | null
  trendingSkills: TrendingSkill[]
}

export function SkillsBrowser({ skillsWithTeachers, categories, userLocation, trendingSkills }: SkillsBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [showNearbyOnly, setShowNearbyOnly] = useState(false)
  const [modeFilter, setModeFilter] = useState<string>("all") // online, in-person, all
  const [priceFilter, setPriceFilter] = useState<string>("all") // free, paid, all
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const popularCategories = [
    {
      name: "Music",
      emoji: "🎸",
      skills: ["Guitar", "Piano", "Singing", "Music Production"],
    },
    {
      name: "Technology",
      emoji: "💻",
      skills: ["Web Dev", "Mobile Apps", "Data Science", "AI/ML", "Cybersecurity"],
    },
    {
      name: "Languages",
      emoji: "🌍",
      skills: ["English", "Spanish", "Arabic", "French", "Chinese", "Urdu"],
    },
    {
      name: "Arts",
      emoji: "🎨",
      skills: ["Drawing", "Graphic Design", "Painting", "Photography", "Editing"],
    },
    {
      name: "Lifestyle",
      emoji: "✨",
      skills: ["Cooking", "Fitness", "Yoga", "Gardening", "Meditation"],
    },
    {
      name: "Career",
      emoji: "🚀",
      skills: ["Public Speaking", "Resume Writing", "Interview Prep", "Marketing"],
    },
    {
      name: "Academics",
      emoji: "📘",
      skills: ["Math", "Science", "History", "Coding for Beginners"],
    },
  ]

  const filteredSkills = useMemo(() => {
    return skillsWithTeachers.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.skills.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.profiles.location_text?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = selectedCategory === "all" || item.skills.categories?.id === selectedCategory

      const matchesLevel = selectedLevel === "all" || item.level === selectedLevel

      const matchesLocation =
        !showNearbyOnly ||
        !userLocation ||
        (item.profiles.location_text &&
          item.profiles.location_text.toLowerCase().includes(userLocation.toLowerCase().split(",")[0]))

      const matchesVerified = !verifiedOnly || (item.profiles.rating >= 4.5 && item.profiles.total_reviews >= 5)

      return matchesSearch && matchesCategory && matchesLevel && matchesLocation && matchesVerified
    })
  }, [skillsWithTeachers, searchTerm, selectedCategory, selectedLevel, showNearbyOnly, userLocation, verifiedOnly])

  const featuredSkills = useMemo(() => {
    return skillsWithTeachers
      .filter((item) => item.profiles.rating >= 4.5 && item.profiles.total_reviews >= 3)
      .slice(0, 3)
  }, [skillsWithTeachers])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {popularCategories.map((category) => (
            <Card
              key={category.name}
              className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 border-gray-100 hover:border-blue-200"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{category.emoji}</span>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                </div>
                <div className="flex flex-wrap gap-1">
                  {category.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {category.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{category.skills.length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {trendingSkills.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-500" />
            Trending This Week
          </h2>
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-6">
              <p className="text-gray-700 mb-4">Most people are learning:</p>
              <div className="flex flex-wrap gap-2">
                {trendingSkills.map((trending) => (
                  <Badge key={trending.skill_id} className="bg-green-600 text-white hover:bg-green-700">
                    {trending.skills.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-8 h-8 text-purple-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">30-Day Skill Challenge</h3>
                <p className="text-gray-600">Join our community challenge and learn something new!</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button asChild className="bg-purple-600 hover:bg-purple-700">
                <Link href="/challenges">Join Challenge</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/challenges">Learn More</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {featuredSkills.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            Featured Teachers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {featuredSkills.map((item) => (
              <Card
                key={item.id}
                className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-xl transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-600 text-white">Featured</Badge>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{item.profiles.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{item.skills.name}</CardTitle>
                  <p className="text-sm text-gray-600">{item.profiles.full_name}</p>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/profile/${item.profiles.id}`}>Connect Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search skills, teachers, or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-blue-500"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="border-gray-200 focus:border-blue-500">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="border-gray-200 focus:border-blue-500">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>

            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="border-gray-200 focus:border-blue-500">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
              </SelectContent>
            </Select>

            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/skills/request">Request a Skill</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            {userLocation && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="nearby-only"
                  checked={showNearbyOnly}
                  onChange={(e) => setShowNearbyOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="nearby-only" className="text-sm text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Show only teachers near {userLocation.split(",")[0]}
                </label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="verified-only"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="verified-only" className="text-sm text-gray-700 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Verified Teachers Only ⭐
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{filteredSkills.length} Skills Available</h2>
          <div className="flex gap-2">
            {showNearbyOnly && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Showing nearby teachers
              </Badge>
            )}
            {verifiedOnly && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                Verified teachers only
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkills.map((item) => (
            <Card key={item.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl text-gray-900">{item.skills.name}</CardTitle>
                    <p className="text-sm text-blue-600 font-medium mt-1">{item.skills.categories?.name}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="capitalize bg-gray-100 text-gray-700">
                      {item.level}
                    </Badge>
                    {item.profiles.rating >= 4.5 && item.profiles.total_reviews >= 5 && (
                      <Badge className="bg-green-600 text-white text-xs">Verified ⭐</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.skills.description && <p className="text-sm text-gray-600">{item.skills.description}</p>}

                {item.description && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800">{item.description}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{item.profiles.full_name || "Anonymous"}</span>
                </div>

                {item.profiles.location_text && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{item.profiles.location_text}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {item.profiles.rating.toFixed(1)} ({item.profiles.total_reviews} reviews)
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{item.years_experience} years experience</span>
                  </div>
                  <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Link href={`/profile/${item.profiles.id}`}>Connect</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {filteredSkills.length === 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No skills found</h3>
            <p className="text-gray-600 mb-6">
              {showNearbyOnly
                ? "No skills found in your area. Try expanding your search or disable location filter."
                : "No skills found matching your criteria. Try adjusting your filters or create a request."}
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/skills/request">Request a Skill</Link>
              </Button>
              {showNearbyOnly && <Button onClick={() => setShowNearbyOnly(false)}>Show All Skills</Button>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
