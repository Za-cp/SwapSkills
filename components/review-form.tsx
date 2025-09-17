"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface ReviewFormProps {
  matchId: string
  revieweeId: string
  revieweeName: string
  skillId: string
  skillName: string
  currentUserId: string
}

export function ReviewForm({ matchId, revieweeId, revieweeName, skillId, skillName, currentUserId }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating before submitting.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("reviews").insert({
        match_id: matchId,
        reviewer_id: currentUserId,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
        skill_id: skillId,
      })

      if (error) throw error

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      })

      router.push("/matches")
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-900 mb-2">How was your experience with {revieweeName}?</p>
        <p className="text-sm text-gray-600 mb-6">Rate your experience learning/teaching {skillName}</p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-colors"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300 hover:text-yellow-300"
                }`}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-sm text-gray-600 mb-4">
            {rating === 1 && "Poor experience"}
            {rating === 2 && "Below average"}
            {rating === 3 && "Average experience"}
            {rating === 4 && "Good experience"}
            {rating === 5 && "Excellent experience"}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">Additional Comments (Optional)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share more details about your experience..."
          rows={4}
        />
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || rating === 0} className="flex-1">
          {isLoading ? "Submitting..." : "Submit Review"}
        </Button>
      </div>
    </form>
  )
}
