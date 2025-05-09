import logging
import sys
import os
from logging.handlers import RotatingFileHandler

# Ensure logs/ directory exists
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# Create a logger
logger = logging.getLogger("app_logger")
logger.setLevel(logging.INFO)  # Default log level

# Formatter for logs
formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(filename)s - %(funcName)s - %(message)s"
)

# Console Handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)

# File Handler (rotates logs at 5MB, keeps 3 backups)
file_handler = RotatingFileHandler(os.path.join(log_dir, "app.log"), maxBytes=5*1024*1024, backupCount=3)
file_handler.setFormatter(formatter)

# Add handlers to logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)
