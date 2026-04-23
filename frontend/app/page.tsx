"use client"

import { useEffect, useState } from "react"
import { getDeals } from "../src/lib/api"

export default function Home() {
  const [deals, setDeals] = useState<any[]>([])

  useEffect(() => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc2OTc3NTczLCJpYXQiOjE3NzY5NzU3NzMsImp0aSI6Ijg2ZTlmZjUyODNjYTQ0ODFiZmIzZWQ0ZDkwMmVhOTUwIiwidXNlcl9pZCI6IjEifQ.OLMqTSHcwhMOrXjoVeO5_Yf8yZCQa6If6JE3kMpnqWA"
    const companyId = 1

    getDeals(token, companyId).then(setDeals)
  }, [])

  // группировка по stage
  const stages = [1, 2, 3, 4, 5]

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-3xl mb-6 font-bold">Pipeline 🔥</h1>

      <div className="grid grid-cols-5 gap-4">
        {stages.map((stage) => (
          <div key={stage} className="bg-gray-900 p-4 rounded">
            <h2 className="mb-4">Stage {stage}</h2>

            {deals
              .filter((d) => d.stage === stage)
              .map((deal) => (
                <div key={deal.id} className="bg-gray-700 p-3 mb-2 rounded">
                  <p>{deal.title}</p>
                  <p>${deal.amount}</p>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}