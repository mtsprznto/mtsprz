from prospector.scrapers.base import BaseScraper, ScraperResult
from prospector.scrapers.chilerut import ChileRutScraper
from prospector.scrapers.ferias_loslagos import FeriasPrensaScraper, FeriasRegistrosScraper
from prospector.scrapers.google_maps import GoogleMapsScraper
from prospector.scrapers.google_search import GoogleSearchScraper
from prospector.scrapers.yelu import YeluScraper
from prospector.scrapers.web_scraper import WebScraper

__all__ = [
    "BaseScraper",
    "ScraperResult",
    "ChileRutScraper",
    "FeriasPrensaScraper",
    "FeriasRegistrosScraper",
    "GoogleMapsScraper",
    "YeluScraper",
    "WebScraper",
]
