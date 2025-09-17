"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  Star,
  MapPin,
  Video,
  Calendar,
  TrendingUp,
  Bell,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
}

interface SkillProgress {
  lesson_number: number
  total_lessons: number
  completed_at: string
}

interface Match {
  id: string
  status: string
  compatibility_score: number
  distance_km: number | null
  created_at: string
  health_status: string
  last_activity: string
  skill_requests: {
    id: string
    title: string
    description: string
    skill_level_needed: string
    skills: {
      id: string
      name: string
    }
  }
  teacher_profile?: {
    id: string
    full_name: string | null
    location_text: string | null
    rating: number
    total_reviews: number
  }
  learner_profile?: {
    id: string
    full_name: string | null
    location_text: string | null
    rating: number
    total_reviews: number
  }
}

interface MatchesListProps {
  learnerMatches: Match[]
  teacherMatches: Match[]
  currentUserId: string
}

export function MatchesList({ learnerMatches, teacherMatches, currentUserId }: MatchesListProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [userPresence, setUserPresence] = useState<Record<string, UserPresence>>({})
  const [skillProgress, setSkillProgress] = useState<Record<string, SkillProgress[]>>({})
  const [newMatchNotifications, setNewMatchNotifications] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const presenceChannel = supabase
      .channel("user-presence")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        (payload) => {
          const presence = payload.new as UserPresence
          setUserPresence((prev) => ({
            ...prev,
            [presence.user_id]: presence,
          }))
        },
      )
      .subscribe()

    const matchesChannel = supabase
      .channel("new-matches")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `learner_id=eq.${currentUserId}`,
        },
        (payload) => {
          setNewMatchNotifications((prev) => [...prev, payload.new.id])
          toast({
            title: "🎉 New Match!",
            description: "A teacher wants to connect with you!",
          })
        },
      )
      .subscribe()

    const progressChannel = supabase
      .channel("skill-progress")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "skill_progress",
        },
        (payload) => {
          const progress = payload.new as any
          setSkillProgress((prev) => ({
            ...prev,
            [progress.match_id]: [...(prev[progress.match_id] || []), progress],
          }))
        },
      )
      .subscribe()

    const updatePresence = async () => {
      await supabase.rpc("update_user_presence", {
        user_uuid: currentUserId,
        online: true,
      })
    }
    updatePresence()

    const presenceInterval = setInterval(updatePresence, 30000)

    const handleVisibilityChange = () => {
      supabase.rpc("update_user_presence", {
        user_uuid: currentUserId,
        online: !document.hidden,
      })
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(presenceInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(matchesChannel)
      supabase.removeChannel(progressChannel)

      supabase.rpc("update_user_presence", {
        user_uuid: currentUserId,
        online: false,
      })
    }
  }, [currentUserId, supabase])

  const handleMatchAction = async (matchId: string, action: "accept" | "decline") => {
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          status: action === "accept" ? "accepted" : "declined",
          accepted_at: action === "accept" ? new Date().toISOString() : null,
        })
        .eq("id", matchId)

      if (error) throw error

      await supabase.from("match_activity").insert({
        match_id: matchId,
        activity_type: action === "accept" ? "match_accepted" : "match_declined",
        user_id: currentUserId,
      })

      toast({
        title: action === "accept" ? "Match accepted" : "Match declined",
        description:
          action === "accept" ? "You can now start chatting with your match!" : "The match has been declined.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating match:", error)
      toast({
        title: "Error",
        description: "Failed to update match. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string, healthStatus?: string) => {
    if (healthStatus === "dormant") {
      return <Clock className="w-5 h-5 text-orange-600" />
    }
    if (healthStatus === "inactive") {
      return <XCircle className="w-5 h-5 text-gray-600" />
    }

    switch (status) {
      case "accepted":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "declined":
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string, healthStatus?: string) => {
    if (healthStatus === "dormant") {
      return "bg-orange-100 text-orange-800"
    }
    if (healthStatus === "inactive") {
      return "bg-gray-100 text-gray-800"
    }

    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800"
      case "declined":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const isUserOnline = (userId: string) => {
    return userPresence[userId]?.is_online || false
  }

  const handleScheduleSession = async (matchId: string) => {
    router.push(`/matches/${matchId}/schedule`)
  }

  const handleVideoCall = async (matchId: string) => {
    router.push(`/matches/${matchId}/video`)
  }

  return (
    <div className="space-y-6">
      {newMatchNotifications.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 font-medium">
                {newMatchNotifications.length} new match{newMatchNotifications.length > 1 ? "es" : ""} available!
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setNewMatchNotifications([])
                  router.refresh()
                }}
              >
                View Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="learning" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="learning">Learning ({learnerMatches.length})</TabsTrigger>
          <TabsTrigger value="teaching">Teaching ({teacherMatches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="learning" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {learnerMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{match.skill_requests.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Learning {match.skill_requests.skills.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(match.status, match.health_status)}
                      <Badge className={getStatusColor(match.status, match.health_status)}>
                        {match.health_status === "dormant" ? "Dormant" : match.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-900">
                          {match.teacher_profile?.full_name || "Anonymous Teacher"}
                        </span>
                        {match.teacher_profile && (
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isUserOnline(match.teacher_profile.id) ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-blue-800">{match.teacher_profile?.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-blue-800">
                      <span>Compatibility: {match.compatibility_score.toFixed(0)}%</span>
                      {match.distance_km && <span>{match.distance_km.toFixed(1)}km away</span>}
                    </div>
                  </div>

                  {skillProgress[match.id] && skillProgress[match.id].length > 0 && (
                    <div className="bg-green-50 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Progress</span>
                      </div>
                      <div className="text-sm text-green-700">
                        Lesson {skillProgress[match.id][skillProgress[match.id].length - 1].lesson_number} of{" "}
                        {skillProgress[match.id][skillProgress[match.id].length - 1].total_lessons} completed
                      </div>
                    </div>
                  )}

                  {match.teacher_profile?.location_text && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{match.teacher_profile.location_text}</span>
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    Matched {formatDistanceToNow(new Date(match.created_at), { addSuffix: true })}
                  </div>

                  {match.status === "accepted" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button asChild size="sm">
                          <Link href={`/chat/${match.id}`}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Chat
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleVideoCall(match.id)}>
                          <Video className="w-4 h-4 mr-2" />
                          Video
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={() => handleScheduleSession(match.id)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Session
                      </Button>
                    </div>
                  )}

                  {match.health_status === "dormant" && (
                    <div className="bg-orange-50 p-3 rounded-md">
                      <p className="text-sm text-orange-800 mb-2">This match has been quiet for a while.</p>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/chat/${match.id}`}>Say Hi 👋</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {learnerMatches.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-600">No learning matches yet. Create a skill request to get started!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teaching" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teacherMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{match.skill_requests.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Teaching {match.skill_requests.skills.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(match.status, match.health_status)}
                      <Badge className={getStatusColor(match.status, match.health_status)}>
                        {match.health_status === "dormant" ? "Dormant" : match.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-900">
                          {match.learner_profile?.full_name || "Anonymous Learner"}
                        </span>
                        {match.learner_profile && (
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isUserOnline(match.learner_profile.id) ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {match.skill_requests.skill_level_needed}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-green-800">
                      <span>Compatibility: {match.compatibility_score.toFixed(0)}%</span>
                      {match.distance_km && <span>{match.distance_km.toFixed(1)}km away</span>}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">{match.skill_requests.description}</p>

                  {match.learner_profile?.location_text && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{match.learner_profile.location_text}</span>
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    Matched {formatDistanceToNow(new Date(match.created_at), { addSuffix: true })}
                  </div>

                  {match.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleMatchAction(match.id, "accept")}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleMatchAction(match.id, "decline")}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Decline
                      </Button>
                    </div>
                  )}

                  {match.status === "accepted" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button asChild size="sm">
                          <Link href={`/chat/${match.id}`}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Chat
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleVideoCall(match.id)}>
                          <Video className="w-4 h-4 mr-2" />
                          Video
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={() => handleScheduleSession(match.id)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Session
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {teacherMatches.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-600">No teaching matches yet. Make sure your skills are marked as teachable!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
