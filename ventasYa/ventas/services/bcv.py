import re
import logging
from decimal import Decimal, InvalidOperation

import requests
from bs4 import BeautifulSoup

from ..models import ExchangeRate

logger = logging.getLogger(__name__)

BCV_URL = "https://www.bcv.org.ve/"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


class BCVScraperError(Exception):
    pass


def _parse_bs_rate(text: str) -> Decimal:
    cleaned = text.strip().replace(".", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        raise BCVScraperError(f"No se pudo interpretar la tasa: '{text}'")


def fetch_bcv_rate(timeout: int = 15) -> dict:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    try:
        resp = requests.get(
            BCV_URL,
            verify=False,
            timeout=timeout,
            headers={"User-Agent": USER_AGENT},
        )
        resp.encoding = "utf-8"
        resp.raise_for_status()
    except requests.RequestException as e:
        raise BCVScraperError(f"Error al conectar con BCV: {e}")

    soup = BeautifulSoup(resp.text, "html.parser")

    dolar_div = soup.find("div", id="dolar")
    if not dolar_div:
        raise BCVScraperError("No se encontró el div del tipo de cambio USD en la página del BCV")

    rate_tag = dolar_div.find("strong", class_="strong-tb")
    if not rate_tag:
        raise BCVScraperError("No se encontró el valor de la tasa USD en la página del BCV")

    raw_text = rate_tag.get_text(strip=True)
    rate = _parse_bs_rate(raw_text)

    date_tag = soup.find("span", class_="date-display-single")
    date_str = date_tag.get_text(strip=True) if date_tag else None

    return {
        "rate": rate,
        "currency": "USD",
        "source": "BCV",
        "date": date_str,
    }


def update_exchange_rate_from_bcv() -> dict:
    data = fetch_bcv_rate()

    ExchangeRate.set_rate(data["rate"])

    logger.info(
        "Tasa BCV actualizada: 1 USD = %s Bs (fecha: %s)",
        data["rate"],
        data["date"] or "N/A",
    )

    return {
        "rate": str(data["rate"]),
        "date": data["date"],
        "source": data["source"],
    }
