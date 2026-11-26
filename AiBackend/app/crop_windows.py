# National sowing/harvest months from typical ICAR Kharif/Rabi/Zaid windows.
# Local KVK timing can differ. This is not a generated week-by-week plan.

WINDOWS = (
    {
        "crop": "Paddy",
        "season": "Kharif",
        "sow_months": (6, 7),
        "harvest_months": (10, 11),
        "source": "ICAR typical Kharif paddy window",
    },
    {
        "crop": "Maize",
        "season": "Kharif",
        "sow_months": (6, 7),
        "harvest_months": (9, 10),
        "source": "ICAR typical Kharif maize window",
    },
    {
        "crop": "Soybean",
        "season": "Kharif",
        "sow_months": (6, 7),
        "harvest_months": (9, 10),
        "source": "ICAR typical Kharif soybean window",
    },
    {
        "crop": "Cotton",
        "season": "Kharif",
        "sow_months": (5, 7),
        "harvest_months": (10, 12),
        "source": "ICAR typical Kharif cotton window",
    },
    {
        "crop": "Groundnut",
        "season": "Kharif",
        "sow_months": (6, 7),
        "harvest_months": (9, 10),
        "source": "ICAR typical Kharif groundnut window",
    },
    {
        "crop": "Wheat",
        "season": "Rabi",
        "sow_months": (11, 12),
        "harvest_months": (3, 4),
        "source": "ICAR typical Rabi wheat window",
    },
    {
        "crop": "Mustard",
        "season": "Rabi",
        "sow_months": (10, 11),
        "harvest_months": (2, 3),
        "source": "ICAR typical Rabi mustard window",
    },
    {
        "crop": "Chickpea",
        "season": "Rabi",
        "sow_months": (10, 11),
        "harvest_months": (2, 3),
        "source": "ICAR typical Rabi chickpea window",
    },
    {
        "crop": "Onion",
        "season": "Rabi",
        "sow_months": (11, 12),
        "harvest_months": (3, 4),
        "source": "ICAR typical Rabi onion window",
    },
    {
        "crop": "Moong",
        "season": "Zaid",
        "sow_months": (3, 4),
        "harvest_months": (5, 6),
        "source": "ICAR typical Zaid moong window",
    },
    {
        "crop": "Watermelon",
        "season": "Zaid",
        "sow_months": (2, 3),
        "harvest_months": (5, 6),
        "source": "ICAR typical Zaid watermelon window",
    },
)


def _month_names(months):
    names = (
        "",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    )
    return [names[m] for m in months]


def find_window(crop):
    key = (crop or "").strip().lower()
    if not key:
        return None
    for row in WINDOWS:
        name = row["crop"].lower()
        if name == key or key in name or name in key:
            return serialize(row)
    return None


def windows_for_season(season):
    return [serialize(row) for row in WINDOWS if row["season"] == season]


def serialize(row):
    return {
        "crop": row["crop"],
        "season": row["season"],
        "sow_months": _month_names(row["sow_months"]),
        "harvest_months": _month_names(row["harvest_months"]),
        "source": row["source"],
        "asOf": "national typical window",
    }
