/**
 * USGA Handicap Calculation Utilities
 *
 * Implements the World Handicap System (WHS) rules:
 * - Handicap Index = Average of best 8 score differentials from most recent 20 rounds
 * - Score Differential = (113 / Slope Rating) × (Adjusted Gross Score - Course Rating)
 * - Course Handicap = Handicap Index × (Slope Rating / 113)
 */

export interface ScoreDifferentialData {
  adjustedGrossScore: number
  courseRating: number
  slopeRating: number
  playedDate: string
}

export interface HandicapCalculationResult {
  handicapIndex: number
  numberOfScoresUsed: number
  scoresUsed: ScoreDifferentialData[]
  averageDifferential: number
}

/**
 * Calculate score differential for a single round
 * Formula: (113 / Slope Rating) × (Adjusted Gross Score - Course Rating)
 */
export function calculateScoreDifferential(
  adjustedGrossScore: number,
  courseRating: number,
  slopeRating: number
): number {
  const differential = (113 / slopeRating) * (adjustedGrossScore - courseRating)
  return Math.round(differential * 10) / 10 // Round to 1 decimal place
}

/**
 * Calculate adjusted gross score using Equitable Stroke Control (ESC)
 * ESC limits the maximum score on any hole based on the player's course handicap
 *
 * Course Handicap | Maximum Score
 * 9 or less       | Double Bogey
 * 10-19           | 7
 * 20-29           | 8
 * 30-39           | 9
 * 40+             | 10
 */
export function calculateAdjustedGrossScore(
  holeScores: number[],
  holePars: number[],
  courseHandicap: number
): number {
  if (holeScores.length !== holePars.length) {
    throw new Error('Hole scores and pars arrays must have the same length')
  }

  let maxScorePerHole: number

  if (courseHandicap <= 9) {
    // Double bogey max
    return holeScores.reduce((sum, score, index) => {
      const par = holePars[index]
      const maxScore = par + 2
      return sum + Math.min(score, maxScore)
    }, 0)
  } else if (courseHandicap <= 19) {
    maxScorePerHole = 7
  } else if (courseHandicap <= 29) {
    maxScorePerHole = 8
  } else if (courseHandicap <= 39) {
    maxScorePerHole = 9
  } else {
    maxScorePerHole = 10
  }

  return holeScores.reduce((sum, score) => {
    return sum + Math.min(score, maxScorePerHole)
  }, 0)
}

/**
 * Calculate course handicap from handicap index
 * Formula: Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
 * Note: The (Course Rating - Par) adjustment is optional and course-specific
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number = 72
): number {
  const courseHandicap = handicapIndex * (slopeRating / 113) + (courseRating - par)
  return Math.round(courseHandicap)
}

/**
 * Calculate handicap index from score differentials
 * Uses best 8 of most recent 20 rounds (WHS)
 *
 * Number of Rounds | Number of Differentials Used
 * 5-6              | Lowest 1
 * 7-8              | Lowest 2
 * 9-11             | Lowest 3
 * 12-14            | Lowest 4
 * 15-16            | Lowest 5
 * 17-18            | Lowest 6
 * 19               | Lowest 7
 * 20+              | Lowest 8
 */
export function calculateHandicapIndex(
  scoreDifferentials: ScoreDifferentialData[]
): HandicapCalculationResult | null {
  const totalRounds = scoreDifferentials.length

  // Need at least 5 rounds to calculate handicap
  if (totalRounds < 5) {
    return null
  }

  // Sort by date (most recent first), then take most recent 20
  const recentRounds = [...scoreDifferentials]
    .sort((a, b) => new Date(b.playedDate).getTime() - new Date(a.playedDate).getTime())
    .slice(0, 20)

  // Calculate differentials for each round
  const differentials = recentRounds.map(round => ({
    ...round,
    differential: calculateScoreDifferential(
      round.adjustedGrossScore,
      round.courseRating,
      round.slopeRating
    )
  }))

  // Sort by differential (lowest first)
  differentials.sort((a, b) => a.differential - b.differential)

  // Determine how many differentials to use based on total rounds
  let numberOfDifferentialsToUse: number
  if (totalRounds <= 6) {
    numberOfDifferentialsToUse = 1
  } else if (totalRounds <= 8) {
    numberOfDifferentialsToUse = 2
  } else if (totalRounds <= 11) {
    numberOfDifferentialsToUse = 3
  } else if (totalRounds <= 14) {
    numberOfDifferentialsToUse = 4
  } else if (totalRounds <= 16) {
    numberOfDifferentialsToUse = 5
  } else if (totalRounds <= 18) {
    numberOfDifferentialsToUse = 6
  } else if (totalRounds === 19) {
    numberOfDifferentialsToUse = 7
  } else {
    numberOfDifferentialsToUse = 8
  }

  // Take the best (lowest) differentials
  const bestDifferentials = differentials.slice(0, numberOfDifferentialsToUse)

  // Calculate average of best differentials
  const sumOfBestDifferentials = bestDifferentials.reduce(
    (sum, round) => sum + round.differential,
    0
  )
  const averageDifferential = sumOfBestDifferentials / numberOfDifferentialsToUse

  // Handicap Index is the average rounded to 1 decimal place
  const handicapIndex = Math.round(averageDifferential * 10) / 10

  return {
    handicapIndex,
    numberOfScoresUsed: numberOfDifferentialsToUse,
    scoresUsed: bestDifferentials.map(d => ({
      adjustedGrossScore: d.adjustedGrossScore,
      courseRating: d.courseRating,
      slopeRating: d.slopeRating,
      playedDate: d.playedDate
    })),
    averageDifferential
  }
}

/**
 * Calculate net score (gross score - course handicap)
 */
export function calculateNetScore(grossScore: number, courseHandicap: number): number {
  return grossScore - courseHandicap
}

/**
 * Determine if a round is eligible for handicap posting
 * - Must be 18 holes
 * - Must have valid course rating and slope
 */
export function isRoundEligibleForHandicap(
  numberOfHoles: number,
  courseRating: number | null | undefined,
  slopeRating: number | null | undefined
): boolean {
  if (numberOfHoles !== 18) {
    return false
  }

  if (!courseRating || !slopeRating) {
    return false
  }

  // Validate reasonable values
  if (courseRating < 60 || courseRating > 80) {
    return false
  }

  if (slopeRating < 55 || slopeRating > 155) {
    return false
  }

  return true
}

/**
 * Format handicap index for display
 * Examples: "+2.5", "10.8", "scratch"
 */
export function formatHandicapIndex(handicapIndex: number | null | undefined): string {
  if (handicapIndex === null || handicapIndex === undefined) {
    return 'N/A'
  }

  if (handicapIndex === 0) {
    return 'Scratch'
  }

  if (handicapIndex > 0) {
    return `+${handicapIndex.toFixed(1)}`
  }

  return Math.abs(handicapIndex).toFixed(1)
}
