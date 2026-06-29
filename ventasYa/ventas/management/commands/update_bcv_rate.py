from django.core.management.base import BaseCommand, CommandError
from ventas.services.bcv import update_exchange_rate_from_bcv, BCVScraperError


class Command(BaseCommand):
    help = "Actualiza la tasa de cambio desde el Banco Central de Venezuela"

    def add_arguments(self, parser):
        parser.add_argument(
            "--quiet",
            action="store_true",
            help="Suprimir salida en consola",
        )

    def handle(self, *args, **options):
        quiet = options.get("quiet", False)

        try:
            result = update_exchange_rate_from_bcv()
        except BCVScraperError as e:
            raise CommandError(str(e))

        if not quiet:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Tasa BCV actualizada: 1 USD = {result['rate']} Bs"
                )
            )
            if result["date"]:
                self.stdout.write(f"Fecha: {result['date']}")
            self.stdout.write(f"Fuente: {result['source']}")
