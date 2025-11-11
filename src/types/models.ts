// Domain models for the golf league application

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  ghinNumber?: string
  role: 'admin' | 'member' | 'viewer'
  currentHandicapIndex?: number
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Course {
  id: string
  name: string
  city?: string
  state?: string
  totalPar: number
  holes?: Hole[]
  teeBoxes?: TeeBox[]
  createdAt: string
  updatedAt: string
}

export interface Hole {
  id: string
  courseId: string
  holeNumber: number
  par: 3 | 4 | 5
  handicapIndex: number
  yardageBlue?: number
  yardageWhite?: number
  yardageRed?: number
}

export interface TeeBox {
  id: string
  courseId: string
  name: string
  color: string
  courseRating: number
  slopeRating: number
  totalYardage: number
  createdAt: string
}

export interface Event {
  id: string
  name: string
  description?: string
  eventDate: string
  startTime?: string
  courseId: string
  teeBoxId: string
  scoringFormat: 'stroke' | 'match' | 'stableford'
  eventType: 'individual' | 'team' | 'both'
  isTeamEvent: boolean
  maxParticipants?: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  createdBy: string
  createdAt: string
  updatedAt: string
  course?: Course
  teeBox?: TeeBox
}

export interface Round {
  id: string
  userId: string
  eventId?: string
  courseId: string
  teeBoxId: string
  playedDate: string
  totalScore: number
  courseHandicap: number
  adjustedScore: number
  scoreDifferential: number
  isPostedForHandicap: boolean
  createdAt: string
  updatedAt: string
  user?: User
  course?: Course
  teeBox?: TeeBox
  scores?: Score[]
}

export interface Score {
  id: string
  roundId: string
  holeId: string
  strokes: number
  putts?: number
  fairwayHit?: boolean
  gir?: boolean
  hole?: Hole
}

export interface Team {
  id: string
  name: string
  captainId: string
  seasonYear: number
  createdAt: string
  updatedAt: string
  captain?: User
  members?: User[]
}

export interface LeaderboardEntry {
  userId: string
  user: User
  grossScore: number
  netScore: number
  points?: number
  position: number
  thru?: number
}
