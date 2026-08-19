export type PlanProgress = {
  percent: number | null
  barPercent: number
  label: string
}

export const calculatePlanProgress = (actualValue: number, targetValue: number): PlanProgress => {
  const actual = Math.max(0, Number(actualValue) || 0)
  const target = Math.max(0, Number(targetValue) || 0)
  if (target === 0) return { percent: null, barPercent: 0, label: 'Не запланировано' }

  const percent = Math.round(actual / target * 100)
  return {
    percent,
    barPercent: Math.min(100, percent),
    label: `${percent}%`,
  }
}

export const calculateCombinedPlanActual = (automaticValue: number, weeklyManualValues: number[]) => {
  const automatic = Math.max(0, Number(automaticValue) || 0)
  const manual = weeklyManualValues.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0)
  return { automatic, manual, total: automatic + manual }
}
