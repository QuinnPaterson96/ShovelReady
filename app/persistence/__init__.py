"""Explicit PostgreSQL imports; importing this package never connects or creates tables."""

from .repository import Repository, connect

__all__ = ["Repository", "connect"]
