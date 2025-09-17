"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Award, Users, Calendar, TrendingUp, Target, Clock, Trophy } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Challenge {
  id: string
  title: string
  description: string
  challenge_type: string
  status: string
  start_date: string
  end_date: string
  max_participants: number
  current_participants: number
  daily_goal_description: string
  total_points_available: number
  badge_reward: string
  skills?: { name: string }
  categories?: { name: string }
}

interface UserParticipation {
  challenge_id: string
  status: string
  current_streak: number
  total_points: number
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [userParticipations, setUserParticipations] = useState<UserParticipation[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    fetchUser()
    fetchChallenges()
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserParticipations()

      const challengesSubscription = supabase
        .channel("challenges-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, () => fetchChallenges())
        .on("postgres_changes", { event: "*", schema: "public", table: "challenge_participants" }, () => {
          fetchChallenges()
          fetchUserParticipations()
        })
        .subscribe()

      return () => {
        challengesSubscription.unsubscribe()
      }
    }
  }, [user])

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchChallenges = async () => {
    const { data, error } = await supabase
      .from("challenges")
      .select(`
        *,
        skills(name),
        categories(name)
      `)
      .order("start_date", { ascending: true })

    if (!error && data) {
      setChallenges(data)
    }
    setLoading(false)
  }

  const fetchUserParticipations = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from("challenge_participants")
      .select("challenge_id, status, current_streak, total_points")
      .eq("user_id", user.id)

    if (!error && data) {
      setUserParticipations(data)
    }
  }

  const joinChallenge = async (challengeId: string) => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const { error } = await supabase.from("challenge_participants").insert({
      challenge_id: challengeId,
      user_id: user.id,
      status: "joined",
    })

    if (!error) {
      fetchChallenges()
      fetchUserParticipations()
    }
  }

  const isUserParticipating = (challengeId: string) => {
    return userParticipations.some((p) => p.challenge_id === challengeId)
  }

  const getUserParticipation = (challengeId: string) => {
    return userParticipations.find((p) => p.challenge_id === challengeId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-600"
      case "upcoming":
        return "bg-blue-600"
      case "completed":
        return "bg-gray-600"
      default:
        return "bg-gray-400"
    }
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const activechallenges = challenges.filter((c) => c.status === "active")
  const upcomingChallenges = challenges.filter((c) => c.status === "upcoming")
  const myParticipations = challenges.filter((c) => isUserParticipating(c.id))

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Skill Challenges</h1>
        <p className="text-gray-600">Join community challenges and level up your skills with others!</p>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Active ({activechallenges.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming ({upcomingChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="my-challenges" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            My Challenges ({myParticipations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activechallenges.map((challenge) => (
              <Card
                key={challenge.id}
                className="hover:shadow-lg transition-all duration-300 border-2 border-green-200"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {challenge.skills?.name || challenge.categories?.name}
                      </p>
                    </div>
                    <Badge className={getStatusColor(challenge.status)}>{challenge.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-700">{challenge.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{getDaysRemaining(challenge.end_date)} days left</span>
                    </div>
                    <Progress
                      value={
                        ((new Date().getTime() - new Date(challenge.start_date).getTime()) /
                          (new Date(challenge.end_date).getTime() - new Date(challenge.start_date).getTime())) *
                        100
                      }
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{challenge.current_participants} joined</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      <span>{challenge.total_points_available} pts</span>
                    </div>
                  </div>

                  {challenge.daily_goal_description && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Daily Goal</span>
                      </div>
                      <p className="text-sm text-blue-700">{challenge.daily_goal_description}</p>
                    </div>
                  )}

                  {isUserParticipating(challenge.id) ? (
                    <div className="space-y-2">
                      {(() => {
                        const participation = getUserParticipation(challenge.id)
                        return (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-green-800">You're participating!</span>
                              <Badge variant="outline" className="text-green-700 border-green-300">
                                {participation?.current_streak || 0} day streak
                              </Badge>
                            </div>
                            <p className="text-sm text-green-700 mt-1">
                              {participation?.total_points || 0} points earned
                            </p>
                          </div>
                        )
                      })()}
                      <Button asChild className="w-full">
                        <Link href={`/challenges/${challenge.id}`}>View Progress</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => joinChallenge(challenge.id)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Join Challenge
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingChallenges.map((challenge) => (
              <Card key={challenge.id} className="hover:shadow-lg transition-all duration-300 border-2 border-blue-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {challenge.skills?.name || challenge.categories?.name}
                      </p>
                    </div>
                    <Badge className={getStatusColor(challenge.status)}>{challenge.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-700">{challenge.description}</p>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Starts {new Date(challenge.start_date).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{challenge.current_participants} registered</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      <span>{challenge.total_points_available} pts</span>
                    </div>
                  </div>

                  {isUserParticipating(challenge.id) ? (
                    <Button disabled className="w-full">
                      Registered ✓
                    </Button>
                  ) : (
                    <Button onClick={() => joinChallenge(challenge.id)} className="w-full">
                      Register for Challenge
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-challenges" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myParticipations.map((challenge) => {
              const participation = getUserParticipation(challenge.id)
              return (
                <Card
                  key={challenge.id}
                  className="hover:shadow-lg transition-all duration-300 border-2 border-purple-200"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {challenge.skills?.name || challenge.categories?.name}
                        </p>
                      </div>
                      <Badge className={getStatusColor(challenge.status)}>{challenge.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-purple-600">{participation?.current_streak || 0}</div>
                          <div className="text-sm text-purple-700">Current Streak</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">{participation?.total_points || 0}</div>
                          <div className="text-sm text-purple-700">Total Points</div>
                        </div>
                      </div>
                    </div>

                    <Button asChild className="w-full">
                      <Link href={`/challenges/${challenge.id}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
