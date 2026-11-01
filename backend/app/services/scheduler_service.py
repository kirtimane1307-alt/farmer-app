"""Background scheduler for periodic agricultural alerts and reminder scanning."""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.database.connection import SessionLocal
from app.services.notification_service import scan_and_generate_alerts

logger = logging.getLogger("farm-management.scheduler")

scheduler = BackgroundScheduler()


def scheduled_farm_scan_job() -> None:
    """Periodic job that scans farm records and generates alerts without duplicating."""
    logger.info("Executing scheduled farm notification and reminder scan...")
    db = SessionLocal()
    try:
        result = scan_and_generate_alerts(db)
        logger.info(
            f"Scheduled scan complete: {result.notifications_created} notifications created, "
            f"{result.reminders_evaluated} records evaluated."
        )
    except Exception as e:
        logger.error(f"Error during scheduled farm notification scan: {e}", exc_info=True)
    finally:
        db.close()


def start_scheduler() -> None:
    """Start the background scheduler if not already running."""
    if not scheduler.running:
        # Run scan every 10 minutes
        scheduler.add_job(
            scheduled_farm_scan_job,
            "interval",
            minutes=10,
            id="farm_notifications_scan",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Farm notification background scheduler started successfully.")


def stop_scheduler() -> None:
    """Shut down the background scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Farm notification background scheduler shut down gracefully.")

