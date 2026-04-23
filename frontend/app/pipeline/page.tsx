"use client";

import Board from "../../src/components/pipeline/Board";

export default function PipelinePage() {
  const stages = [
    { id: "1", name: "Новые" },
    { id: "2", name: "В работе" },
  ];

  const dealsByStage = {
    "1": [
      { id: "1", title: "Сделка 1", stageId: "1" },
      { id: "2", title: "Сделка 2", stageId: "1" },
    ],
    "2": [
      { id: "3", title: "Сделка 3", stageId: "2" },
    ],
  };

  return (
    <div className="p-6">
      <Board stages={stages} dealsByStage={dealsByStage} />
    </div>
  );
}