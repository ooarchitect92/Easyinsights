from fastapi import Depends, FastAPI
from easyinsights_ml.auth import require_internal_authorization
from easyinsights_ml.contracts import SeasonalNaiveRequest, SeasonalNaiveResponse
from easyinsights_ml.models.forecasting.seasonal_naive import seasonal_naive
from easyinsights_ml.registry import MODEL_REGISTRY

app = FastAPI(title="Easyinsights ML Service", docs_url=None, redoc_url=None)

@app.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/health/ready")
def ready() -> dict[str, str]:
    return {"status": "ready"}

@app.get("/v1/registry", dependencies=[Depends(require_internal_authorization)])
def registry() -> dict[str, object]:
    return {"models": MODEL_REGISTRY}

@app.post("/v1/forecast/seasonal-naive", response_model=SeasonalNaiveResponse, dependencies=[Depends(require_internal_authorization)])
def forecast(request: SeasonalNaiveRequest) -> SeasonalNaiveResponse:
    point = seasonal_naive(request.values, request.horizon, request.season_length)
    return SeasonalNaiveResponse(
        model="seasonal-naive-v1",
        status="completed",
        horizon=request.horizon,
        season_length=request.season_length,
        point=point,
        warnings=["Deterministic baseline only; no calibrated uncertainty interval is implied."],
    )
