"use client";

import Board from "@/src/components/pipeline/Board";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";

export default function PipelinePage() {
  const { logout } = useAuth();

  const companyId = 1;

  const stages = [
    { id: "1", name: "Новые" },
    { id: "2", name: "В работе" },
  ];

  const dealsByStage = {
    "1": [
      { id: "1", title: "Сделка 1", stage: "1", stageId: "1" },
      { id: "2", title: "Сделка 2", stage: "1", stageId: "1" },
    ],
    "2": [
      { id: "3", title: "Сделка 3", stage: "2", stageId: "2" },
    ],
  };

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => logout("manual_logout")}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Выйти
          </button>
        </div>
        <Board
          stages={stages}
          dealsByStage={dealsByStage}
          companyId={companyId}
        />
      </div>
    </ProtectedRoute>
  );
}