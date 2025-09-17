"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Target, Trophy } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

interface Challenge {
  id: string
  title: string
  description: string
  challenge_type: string
  status: string
  start_date: string
  end_date: string
  current_participants: number
  daily_goal_description: string
  total_points_available: number
  badge_reward: string
  skills?: { name: string }
  categories?: { name: string }
}

interface Participant {
  id: string
  user_id: string
  status: string
  current_streak: number
  total_points: number
  profiles: {
    full_name: string
    avatar_url: string
  }
}

interface LeaderboardEntry {
  user_id: string
  rank: number
  total_points: number
  current_streak: number
  completion_percentage: number
  profiles: {
    full_name: string
    avatar_url: string
  }
}

interface DailyProgress {
  progress_date: string
  completed: boolean
  points_earned: number
  notes: string
}

export default function ChallengePage() {
  const params = useParams()
  const router = useRouter()
  const challengeId = params.id as string

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userProgress, setUserProgress] = useState<DailyProgress[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [todayNotes, setTodayNotes] = useState("")
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchUser()
    fetchChallenge()
    fetchParticipants()
    fetchLeaderboard()
  }, [challengeId])

  useEffect(() => {
    if (user) {
      fetchUserProgress()

      const progressSubscription = supabase
        .channel(`challenge-${challengeId}-progress`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "challenge_progress", filter: `challenge_id=eq.${challengeId}` },
          () => {
            fetchLeaderboard()
            fetchUserProgress()
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "challenge_participants", filter: `challenge_id=eq.${challengeId}` },
          () => {
            fetchParticipants()
            fetchLeaderboard()
          },
        )
        .subscribe()

      return () => {
        progressSubscription.unsubscribe()
      }
    }
  }, [user, challengeId])

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchChallenge = async () => {
    const { data, error } = await supabase
      .from("challenges")
      .select(`
        *,
        skills(name),
        categories(name)
      `)
      .eq("id", challengeId)
      .single()

    if (!error && data) {
      setChallenge(data)
    }
    setLoading(false)
  }

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("challenge_participants")
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq("challenge_id", challengeId)
      .eq("status", "joined")

    if (!error && data) {
      setParticipants(data)
    }
  }

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from("challenge_leaderboard")
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq("challenge_id", challengeId)
      .order("rank", { ascending: true })
      .limit(10)

    if (!error && data) {
      setLeaderboard(data)
    }
  }

  const fetchUserProgress = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .order("progress_date", { ascending: true })

    if (!error && data) {
      setUserProgress(data)
    }
  }

  const markDayComplete = async (completed: boolean) => {
    if (!user || !challenge) return

    setIsUpdatingProgress(true)
    const today = new Date().toISOString().split("T")[0]

    const { error } = await supabase.from("challenge_progress").upsert({
      challenge_id: challengeId,
      user_id: user.id,
      progress_date: today,
      completed,
      points_earned: completed ? 10 : 0, // Base points for daily completion
      notes: todayNotes,
    })

    if (!error) {
      // Update participant stats
      const currentStreak = completed ? calculateNewStreak() : 0
      const totalPoints = userProgress.reduce((sum, p) => sum + p.points_earned, 0) + (completed ? 10 : 0)

      await supabase
        .from("challenge_participants")
        .update({
          current_streak: currentStreak,
          total_points: totalPoints,
          last_activity_at: new Date().toISOString(),
        })
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id)

      // Update leaderboard
      await supabase.rpc("update_challenge_leaderboard", { challenge_uuid: challengeId })

      fetchUserProgress()
      fetchLeaderboard()
      setTodayNotes("")
    }
    setIsUpdatingProgress(false)
  }

  const calculateNewStreak = () => {
    const sortedProgress = [...userProgress].sort(
      (a, b) => new Date(b.progress_date).getTime() - new Date(a.progress_date).getTime(),
    )

    let streak = 1 // Today counts as 1
    for (let i = 0; i < sortedProgress.length; i++) {
      if (sortedProgress[i].completed) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  const getTodayProgress = () => {
    const today = new Date().toISOString().split("T")[0]
    return userProgress.find((p) => p.progress_date === today)
  }

  const getDaysRemaining = () => {
    if (!challenge) return 0
    const end = new Date(challenge.end_date)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const getCompletionPercentage = () => {
    if (!challenge) return 0
    const totalDays = Math.ceil(
      (new Date(challenge.end_date).getTime() - new Date(challenge.start_date).getTime()) / (1000 * 60 * 60 * 24),
    )
    const completedDays = userProgress.filter((p) => p.completed).length
    return Math.round((completedDays / totalDays) * 100)
  }

  if (loading || !challenge) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  const todayProgress = getTodayProgress()
  const userParticipant = participants.find((p) => p.user_id === user?.id)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{challenge.title}</h1>
            <p className="text-gray-600 mt-1">{challenge.skills?.name || challenge.categories?.name}</p>
          </div>
          <Badge className={challenge.status === "active" ? "bg-green-600" : "bg-blue-600"}>{challenge.status}</Badge>
        </div>

        <p className="text-gray-700 mb-6">{challenge.description}</p>

        {/* Challenge Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{getDaysRemaining()}</div>
              <div className="text-sm text-gray-600">Days Left</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{challenge.current_participants}</div>
              <div className="text-sm text-gray-600">Participants</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{userParticipant?.current_streak || 0}</div>
              <div className="text-sm text-gray-600">Your Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{userParticipant?.total_points || 0}</div>
              <div className="text-sm text-gray-600">Your Points</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress">Daily Progress</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          {/* Daily Goal */}
          {challenge.daily_goal_description && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Today's Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{challenge.daily_goal_description}</p>

                {/* Today's Progress */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Mark today as complete:</span>
                    <div className="flex items-center gap-2">
                      {todayProgress?.completed ? (
                        <Badge className="bg-green-600">Completed ✓</Badge>
                      ) : (
                        <Button
                          onClick={() => markDayComplete(true)}
                          disabled={isUpdatingProgress}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isUpdatingProgress ? "Updating..." : "Mark Complete"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {!todayProgress?.completed && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Add notes about your progress (optional):
                      </label>
                      <Textarea
                        value={todayNotes}
                        onChange={(e) => setTodayNotes(e.target.value)}
                        placeholder="What did you accomplish today?"
                        className="min-h-[80px]"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Completion</span>
                    <span>{getCompletionPercentage()}%</span>
                  </div>
                  <Progress value={getCompletionPercentage()} className="h-3" />
                </div>

                {/* Progress Calendar */}
                <div className="grid grid-cols-7 gap-2 mt-6">
                  {Array.from({ length: 30 }, (_, i) => {
                    const date = new Date()
                    date.setDate(date.getDate() - (29 - i))
                    const dateStr = date.toISOString().split("T")[0]
                    const dayProgress = userProgress.find((p) => p.progress_date === dateStr)

                    return (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          dayProgress?.completed
                            ? "bg-green-500 text-white"
                            : date.toDateString() === new Date().toDateString()
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-600"
                        }`}
                        title={`${date.toLocaleDateString()} - ${dayProgress?.completed ? "Completed" : "Not completed"}`}
                      >
                        {date.getDate()}
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Challenge Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      entry.user_id === user?.id ? "bg-blue-50 border-2 border-blue-200" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? "bg-yellow-500 text-white"
                            : index === 1
                              ? "bg-gray-400 text-white"
                              : index === 2
                                ? "bg-orange-600 text-white"
                                : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {entry.rank}
                      </div>
                      <Avatar>
                        <AvatarImage src={entry.profiles.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback>{entry.profiles.full_name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{entry.profiles.full_name || "Anonymous"}</div>
                        <div className="text-sm text-gray-600">{entry.completion_percentage.toFixed(1)}% complete</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.total_points}</div>
                      <div className="text-sm text-gray-600">{entry.current_streak} day streak</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Challenge Participants ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar>
                      <AvatarImage src={participant.profiles.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback>{participant.profiles.full_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{participant.profiles.full_name || "Anonymous"}</div>
                      <div className="text-sm text-gray-600">
                        {participant.current_streak} day streak • {participant.total_points} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
