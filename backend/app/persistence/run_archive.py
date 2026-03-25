from __future__ import annotations

from pathlib import Path

from app.models.schema.run_archive import RunDetail, RunSummary


class FileRunArchiveStore:
    def __init__(self, root: Path) -> None:
        self._root = root
        self._root.mkdir(parents=True, exist_ok=True)

    @property
    def root(self) -> Path:
        return self._root

    def list_summaries(self) -> list[RunSummary]:
        summaries: list[RunSummary] = []
        for path in sorted(self._root.glob("*.json")):
            try:
                detail = RunDetail.model_validate_json(path.read_text())
            except Exception:
                continue
            summaries.append(detail.summary)
        return sorted(summaries, key=lambda item: item.completed_at_ms, reverse=True)

    def get(self, run_id: str) -> RunDetail | None:
        path = self._root / f"{run_id}.json"
        if not path.exists():
            return None
        return RunDetail.model_validate_json(path.read_text())

    def save(self, detail: RunDetail) -> None:
        path = self._root / f"{detail.summary.run_id}.json"
        tmp_path = path.with_suffix(".json.tmp")
        tmp_path.write_text(detail.model_dump_json(indent=2))
        tmp_path.replace(path)
