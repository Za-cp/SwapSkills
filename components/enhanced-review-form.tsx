"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star, Flag } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface EnhancedReviewFormProps {
  matchId: string
  revieweeId: string
  revieweeName: string
  skillId: string
  skillName: string
  currentUserId: string
  existingReview?: {
    id: string
    rating: number
    comment: string | null
    edit_count: number
  }
}

export function EnhancedReviewForm({
  matchId,
  revieweeId,
  revieweeName,
  skillId,
  skillName,
  currentUserId,
  existingReview,
}: EnhancedReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState(existingReview?.comment || "")
  const [isLoading, setIsLoading] = useState(false)
  const [flagReason, setFlagReason] = useState("")
  const router = useRouter()

  const supabase = createClient()
  const canEdit = existingReview && existingReview.edit_count < 3 // Max 3 edits
  const isEditing = !!existingReview

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

    try {
      if (isEditing && existingReview) {
        // Update existing review
        const { error: historyError } = await supabase.from("review_edit_history").insert({
          review_id: existingReview.id,
          old_rating: existingReview.rating,
          old_comment: existingReview.comment,
          new_rating: rating,
          new_comment: comment.trim() || null,
        })

        if (historyError) throw historyError

        const { error } = await supabase
          .from("reviews")
          .update({
            rating,
            comment: comment.trim() || null,
            edit_count: existingReview.edit_count + 1,
            last_edited_at: new Date().toISOString(),
          })
          .eq("id", existingReview.id)

        if (error) throw error

        toast({
          title: "Review updated",
          description: "Your review has been updated successfully.",
        })
      } else {
        // Create new review
        const { error } = await supabase.from("reviews").insert({
          match_id: matchId,
          reviewer_id: currentUserId,
          reviewee_id: revieweeId,
          rating,
          comment: comment.trim() || null,
          skill_id: skillId,
        })

        if (error) throw error

        // Create notification for reviewee
        await supabase.rpc("create_notification", {
          p_user_id: revieweeId,
          p_type: "review_received",
          p_title: "New Review Received",
          p_message: `You received a ${rating}-star review for ${skillName}`,
          p_data: { match_id: matchId, rating, skill_name: skillName },
        })

        toast({
          title: "Review submitted",
          description: "Thank you for your feedback!",
        })
      }

      router.push("/matches")
    } catch (error) {
      console.error("Error with review:", error)
      toast({
        title: "Error",
        description: "Failed to process review. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFlag = async () => {
    if (!flagReason.trim()) return

    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          is_flagged: true,
          flag_reason: flagReason,
          flagged_by: currentUserId,
          flagged_at: new Date().toISOString(),
        })
        .eq("id", existingReview?.id)

      if (error) throw error

      toast({
        title: "Review flagged",
        description: "Thank you for reporting. We'll review this shortly.",
      })
    } catch (error) {
      console.error("Error flagging review:", error)
      toast({
        title: "Error",
        description: "Failed to flag review. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isEditing ? "Edit your review" : "How was your experience"} with {revieweeName}?
        </p>
        <p className="text-sm text-gray-600 mb-6">
          {isEditing ? "Update your" : "Rate your"} experience learning/teaching {skillName}
        </p>

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

      {isEditing && existingReview && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
          <p>Edits remaining: {3 - existingReview.edit_count}</p>
          {existingReview.edit_count >= 3 && <p className="text-red-600">Maximum edits reached</p>}
        </div>
      )}

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
          Cancel
        </Button>

        {isEditing && existingReview && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Flag className="w-4 h-4 mr-2" />
                Flag
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Flag Review</AlertDialogTitle>
                <AlertDialogDescription>Why are you flagging this review?</AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Reason for flagging..."
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleFlag}>Flag Review</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <Button type="submit" disabled={isLoading || rating === 0 || (isEditing && !canEdit)} className="flex-1">
          {isLoading ? "Processing..." : isEditing ? "Update Review" : "Submit Review"}
        </Button>
      </div>
    </form>
  )
}
