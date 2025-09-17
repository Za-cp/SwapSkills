"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Star } from "lucide-react"

interface RatingDistribution {
  rating: number
  count: number
}

interface RatingHistogramProps {
  distribution: RatingDistribution[]
  totalReviews: number
  averageRating: number
}

export function RatingHistogram({ distribution, totalReviews, averageRating }: RatingHistogramProps) {
  // Create array for all ratings 1-5, filling in missing ratings with 0
  const fullDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const found = distribution.find((d) => d.rating === rating)
    return { rating, count: found?.count || 0 }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          Rating Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Rating */}
        <div className="text-center pb-4 border-b">
          <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
          <div className="flex justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-gray-600">{totalReviews} reviews</div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {fullDistribution.map(({ rating, count }) => {
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium">{rating}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <Progress value={percentage} className="h-2" />
                </div>
                <div className="text-sm text-gray-600 w-8 text-right">{count}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
