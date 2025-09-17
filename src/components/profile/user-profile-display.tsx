import { UserProfile, getRoleDisplayName, getTrustScoreColor, getTrustScoreLabel } from '@/types/user'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, Mail, Shield, TrendingUp } from 'lucide-react'

interface UserProfileDisplayProps {
  user: UserProfile
  showSensitiveInfo?: boolean
}

export function UserProfileDisplay({ user, showSensitiveInfo = false }: UserProfileDisplayProps) {
  const trustScoreColor = getTrustScoreColor(user.trustScore)
  const trustScoreLabel = getTrustScoreLabel(user.trustScore)

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar || user.image || undefined} alt={user.name || 'User'} />
            <AvatarFallback className="text-lg">
              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || user.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-2xl">{user.name || 'Unnamed User'}</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline">
                <Shield className="mr-1 h-3 w-3" />
                {getRoleDisplayName(user.role)}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span>{user.email}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined:</span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Trust Score:</span>
              <div className="flex items-center space-x-2">
                <span className={`font-semibold ${trustScoreColor}`}>
                  {user.trustScore.toFixed(1)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {trustScoreLabel}
                </Badge>
              </div>
            </div>
            
            {showSensitiveInfo && (
              <>
                <div className="text-sm">
                  <span className="text-muted-foreground">User ID: </span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{user.id}</code>
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">Last Updated: </span>
                  <span>{new Date(user.updatedAt).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
