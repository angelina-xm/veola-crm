const API_URL = "http://127.0.0.1:8000/api"

export async function getDeals(token: string, companyId: number) {
  const res = await fetch(`${API_URL}/deals/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Company-ID": companyId.toString(),
    },
  })
console.log("STATUS:", res.status)
  return res.json()
}