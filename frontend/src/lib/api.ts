const API_URL = "http://127.0.0.1:8000/api"

export async function getDeals(token: string, companyId: number) {
  const res = await fetch(`${API_URL}/deals/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Company-ID": companyId.toString(),
    },
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch deals: ${res.statusText}`)
  }
  
  return res.json()
}

export async function getPipelineStages(token: string, companyId: number) {
  const res = await fetch(`${API_URL}/pipeline-stages/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Company-ID": companyId.toString(),
    },
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch stages: ${res.statusText}`)
  }
  
  return res.json()
}

// 🔥 ГЛАВНАЯ ФУНКЦИЯ - обновление stage сделки
export async function updateDealStage(
  token: string,
  companyId: number,
  dealId: string | number,
  stageId: string | number,
  order?: number
) {
  const res = await fetch(`${API_URL}/deals/${dealId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Company-ID": companyId.toString(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      stage: stageId,
      ...(order !== undefined && { order }),
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to update deal: ${res.statusText}`)
  }

  return res.json()
}

// Группировка сделок по stage
export function groupDealsByStage(deals: any[], stages: any[]) {
  const grouped: Record<string, any[]> = {}
  
  // Инициализируем все stages
  stages.forEach(stage => {
    grouped[String(stage.id)] = []
  })

  // Распределяем сделки
  deals.forEach(deal => {
    const stageId = String(deal.stage || deal.stageId)
    if (grouped[stageId]) {
      grouped[stageId].push({
        ...deal,
        stageId,
      })
    }
  })

  return grouped
}
