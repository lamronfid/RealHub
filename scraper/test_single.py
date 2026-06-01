import sys
import asyncio
import json
from single_scraper import scrape_single_url

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    urls = [
        "https://www.infocasas.com.py/alquilo-moderno-semipiso-edificio-miranda/193765831",
        "https://clasipar.paraguay.com/inmuebles/departamentos/alquilo-departamento-amoblado-con-dos-cocheras-y-baulera-2912854"
    ]
    
    for url in urls:
        print(f"Testing URL: {url}")
        try:
            res = await scrape_single_url(url)
            print("Scraped successfully! Result:")
            print(json.dumps(res, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"Failed to scrape: {e}")
        print("=" * 60)

asyncio.run(main())
