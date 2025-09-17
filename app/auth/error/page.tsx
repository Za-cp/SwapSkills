import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {params?.error ? (
              <p className="text-sm text-gray-600 mb-6">Error: {params.error}</p>
            ) : (
              <p className="text-sm text-gray-600 mb-6">An unexpected error occurred during authentication.</p>
            )}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 font-medium text-sm">
              Try Again
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
