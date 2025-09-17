"use client"

import Link from "next/link"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Clock, User, Search, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface SkillRequest {
  id: string
  title: string
  description: string
  skill_level_needed: string
  location_text: string | null
  max_distance_km: number
  is_remote: boolean
  created_at: string
  skills: {
    id: string
    name: string
    categories: {
      id: string
      name: string
    } | null
  }
  offered_skills: {
    id: string
    name: string
  } | null
  profiles: {
    id: string
    full_name: string | null
    location_text: string | null
    rating: number
    total_reviews: number
  }
}

interface SkillRequestsListProps {
  skillRequests: SkillRequest[]
  currentUserId: string
}

export function SkillRequestsList({ skillRequests, currentUserId }: SkillRequestsListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")

  const filteredRequests = skillRequests.filter((request) => {
    const matchesSearch =
      searchTerm === "" ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.skills.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesLevel = selectedLevel === "all" || request.skill_level_needed === selectedLevel

    return matchesSearch && matchesLevel
  })

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{request.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline">{request.skills.name}</Badge>
                    <Badge variant="secondary" className="capitalize">
                      {request.skill_level_needed}
                    </Badge>
                    {request.is_remote && <Badge className="bg-green-100 text-green-800">Remote OK</Badge>}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-3">{request.description}</p>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{request.profiles.full_name || "Anonymous"}</span>
                </div>

                {request.location_text && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {request.location_text} (within {request.max_distance_km}km)
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {request.offered_skills && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Offering in exchange:</strong> {request.offered_skills.name}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-500">{request.skills.categories?.name || "Uncategorized"}</span>
                <Button size="sm" disabled={request.profiles.id === currentUserId}>
                  {request.profiles.id === currentUserId ? "Your Request" : "Respond"}
                  {request.profiles.id !== currentUserId && <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-4">No skill requests found matching your criteria.</p>
            <Button asChild>
              <Link href="/skills/request">Create the First Request</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
