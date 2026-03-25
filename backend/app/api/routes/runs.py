from fastapi import APIRouter, Depends, HTTPException

from app.models.schema.run_archive import RunDetail, RunSummary
from app.simulation.runner import SimulationRunner, simulation_runner

router = APIRouter()


def get_runner() -> SimulationRunner:
    return simulation_runner


@router.get("/runs", response_model=list[RunSummary])
async def list_runs(runner: SimulationRunner = Depends(get_runner)):
    return runner.list_saved_runs()


@router.get("/runs/{run_id}", response_model=RunDetail)
async def get_run(run_id: str, runner: SimulationRunner = Depends(get_runner)):
    run = runner.get_saved_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return run


@router.delete("/runs/{run_id}", status_code=204)
async def delete_run(run_id: str, runner: SimulationRunner = Depends(get_runner)):
    deleted = runner.delete_saved_run(run_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
