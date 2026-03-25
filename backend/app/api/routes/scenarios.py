from fastapi import APIRouter, HTTPException
from app.simulation.scenario_loader import ScenarioLoader
from app.models.schema.scenario import ScenarioDefinition, ScenarioMetadata

router = APIRouter()
_loader = ScenarioLoader()


@router.get("/scenarios", response_model=list[ScenarioMetadata])
async def list_scenarios():
    return _loader.list_metadata()


@router.get("/scenarios/{scenario_id}", response_model=ScenarioDefinition)
async def get_scenario(scenario_id: str):
    scenario = _loader.get(scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    return scenario
