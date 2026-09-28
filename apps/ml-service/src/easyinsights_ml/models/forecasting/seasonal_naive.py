def seasonal_naive(values: list[float], horizon: int, season_length: int) -> list[float]:
    if not values:
        raise ValueError("values cannot be empty")
    if season_length < 1 or season_length > len(values):
        raise ValueError("season_length must be between 1 and the history length")
    if horizon < 1:
        raise ValueError("horizon must be positive")
    season = values[-season_length:]
    return [float(season[index % season_length]) for index in range(horizon)]
