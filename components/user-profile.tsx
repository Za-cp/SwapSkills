"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Clock, User, BookOpen, Users } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { RatingHistogram } from "@/components/rating-histogram"
import { createClient } from "@/lib/supabase/client"

interface Profile {
  id: string
  full_name: string | null
  bio: string | null
  location_text: string | null
  rating: number
  total_reviews: number
  created_at: string
  is_available: boolean
}

interface UserSkill {
  id: string
  level: string
  years_experience: number
  can_teach: boolean
  wants_to_learn: boolean
  description: string | null
  skills: {
    id: string
    name: string
    categories: {
      id: string
      name: string
    } | null
  }
}

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: {
    id: string
    full_name: string | null
  }
  skills: {
    id: string
    name: string
  } | null
}

interface UserProfileProps {
  profile: Profile
  userSkills: UserSkill[]
  reviews: Review[]
  isOwnProfile: boolean
}

export function UserProfile({ profile, userSkills, reviews, isOwnProfile }: UserProfileProps) {
  const teachingSkills = userSkills.filter((skill) => skill.can_teach)
  const learningSkills = userSkills.filter((skill) => skill.wants_to_learn)
  const [ratingDistribution, setRatingDistribution] = useState<{ rating: number; count: number }[]>([])

  const supabase = createClient()

  useEffect(() => {
    const fetchRatingDistribution = async () => {
      const { data, error } = await supabase.rpc("get_rating_distribution", {
        p_user_id: profile.id,
      })

      if (!error && data) {
        setRatingDistribution(data)
      }
    }

    fetchRatingDistribution()
  }, [profile.id])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="w-24 h-24 mx-auto md:mx-0">
              <AvatarImage src={undefined || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl">
                <User className="w-12 h-12" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.full_name || "Anonymous User"}</h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{profile.rating.toFixed(1)}</span>
                  <span className="text-gray-600">({profile.total_reviews} reviews)</span>
                </div>

                {profile.location_text && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location_text}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {profile.bio && <p className="text-gray-700 mb-4">{profile.bio}</p>}

              <div className="flex items-center gap-2">
                <Badge variant={profile.is_available ? "default" : "secondary"}>
                  {profile.is_available ? "Available" : "Unavailable"}
                </Badge>
                {isOwnProfile && (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/profile">Edit Profile</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                <CardTitle>Skills I Can Teach ({teachingSkills.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {teachingSkills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teachingSkills.map((userSkill) => (
                    <div key={userSkill.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{userSkill.skills.name}</h4>
                        <Badge variant="secondary" className="capitalize">
                          {userSkill.level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{userSkill.skills.categories?.name}</p>
                      <p className="text-sm text-gray-600">{userSkill.years_experience} years experience</p>
                      {userSkill.description && <p className="text-sm text-gray-700 mt-2">{userSkill.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No teaching skills listed yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <CardTitle>Skills I Want to Learn ({learningSkills.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {learningSkills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {learningSkills.map((userSkill) => (
                    <div key={userSkill.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{userSkill.skills.name}</h4>
                        <Badge variant="outline" className="capitalize">
                          {userSkill.level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{userSkill.skills.categories?.name}</p>
                      {userSkill.description && <p className="text-sm text-gray-700 mt-2">{userSkill.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No learning goals listed yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {profile.total_reviews > 0 && (
            <RatingHistogram
              distribution={ratingDistribution}
              totalReviews={profile.total_reviews}
              averageRating={profile.rating}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews ({reviews.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {review.reviewer.full_name || "Anonymous"}
                      </p>
                      {review.skills && <p className="text-sm text-gray-600 mb-2">For {review.skills.name}</p>}
                      {review.comment && <p className="text-sm text-gray-700">{review.comment}</p>}
                    </div>
                  ))}
                  {reviews.length > 5 && (
                    <p className="text-sm text-gray-600 text-center">And {reviews.length - 5} more reviews...</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">No reviews yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
