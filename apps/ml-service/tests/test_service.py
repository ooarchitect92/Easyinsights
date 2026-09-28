from fastapi.testclient import TestClient
from easyinsights_ml.main import app
from easyinsights_ml.models.forecasting.seasonal_naive import seasonal_naive

def test_seasonal_naive_repeats_last_season() -> None:
    assert seasonal_naive([1.0, 2.0, 3.0, 4.0], 5, 2) == [3.0, 4.0, 3.0, 4.0, 3.0]

def test_internal_auth_and_forecast(monkeypatch) -> None:
    monkeypatch.setenv("ML_INTERNAL_TOKEN", "test-token")
    client = TestClient(app)
    denied = client.post("/v1/forecast/seasonal-naive", json={"values":[1,2,3,4],"horizon":2,"season_length":2})
    assert denied.status_code == 401
    response = client.post(
        "/v1/forecast/seasonal-naive",
        headers={"authorization":"Bearer test-token"},
        json={"values":[1,2,3,4],"horizon":3,"season_length":2},
    )
    assert response.status_code == 200
    assert response.json()["point"] == [3.0,4.0,3.0]
