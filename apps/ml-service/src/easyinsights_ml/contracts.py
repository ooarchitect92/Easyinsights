from pydantic import BaseModel, Field, field_validator

class SeasonalNaiveRequest(BaseModel):
    values: list[float] = Field(min_length=2, max_length=10_000)
    horizon: int = Field(ge=1, le=365)
    season_length: int = Field(ge=1, le=365)

    @field_validator("values")
    @classmethod
    def finite_values(cls, values: list[float]) -> list[float]:
        if any(value != value or value in (float("inf"), float("-inf")) for value in values):
            raise ValueError("values must be finite")
        return values

class SeasonalNaiveResponse(BaseModel):
    model: str
    status: str
    horizon: int
    season_length: int
    point: list[float]
    warnings: list[str]
