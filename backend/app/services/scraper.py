import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event


async def scrape_instagram_profile(username: str) -> list[dict]:
    """Scrape public Instagram profile for event-like posts.

    Instagram's public pages are heavily JS-rendered, so this uses
    a lightweight approach that works for public profiles.
    Falls back gracefully if blocked.
    """
    url = f"https://www.instagram.com/{username}/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }

    events = []
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            if response.status_code != 200:
                return events

            soup = BeautifulSoup(response.text, "html.parser")
            meta_tags = soup.find_all("meta", attrs={"property": "og:description"})
            for meta in meta_tags:
                content = meta.get("content", "")
                if content:
                    events.append({
                        "title": f"Post from @{username}",
                        "description": content[:500],
                        "source": "instagram",
                        "source_url": url,
                        "club_name": username,
                    })
    except httpx.HTTPError:
        pass

    return events


async def scrape_and_store_events(db: AsyncSession, usernames: list[str]) -> int:
    count = 0
    for username in usernames:
        posts = await scrape_instagram_profile(username)
        for post in posts:
            event = Event(**post)
            db.add(event)
            count += 1
    if count > 0:
        await db.commit()
    return count


UBC_CLUB_INSTAGRAMS = [
    "ubcstudentunion",
    "ubccsss",
    "ubcbcs",
    "ubcengineers",
    "ubcrec",
    "ubcnss",
    "ubcisa",
    "ubcsailingclub",
    "ubchiking",
    "ubcphotoclub",
]
