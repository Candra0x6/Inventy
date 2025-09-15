import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function ItemNotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <Card className="p-8">
          <div className="text-6xl mb-4">📦</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Item Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The item you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/items">
                Browse All Items
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
