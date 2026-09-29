from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))


def now() -> datetime:
    return datetime.now(tz=IST).replace(microsecond=0)


def floor_to(dt: datetime, minutes: int) -> datetime:
    return dt.replace(minute=(dt.minute // minutes) * minutes, second=0, microsecond=0)


def iso(dt: datetime) -> str:
    return dt.isoformat()


def humanize_since(dt: datetime) -> str:
    from app.i18n import t  # local import: i18n must not be a hard dep of time utils
    delta = int((now() - dt).total_seconds())
    if delta < 90:
        return t("time.just_now")
    if delta < 3600:
        return t("time.min_ago", n=delta // 60)
    if delta < 86400:
        return t("time.h_ago", n=delta // 3600)
    return t("time.d_ago", n=delta // 86400)
