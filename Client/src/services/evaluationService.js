import { getEvaluations, createEvaluation } from './api.js'

export async function fetchEvaluations(params = {}) {
  return getEvaluations(params)
}

export async function submitEvaluation(body) {
  return createEvaluation(body)
}
